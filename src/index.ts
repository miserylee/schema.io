import * as assert from 'assert';

const isPureObject = (v: any) => v !== null
  && typeof v === 'object'
  && Array.isArray(v) === false
  && !(v instanceof Date);

export interface IParsedSchema {
  type?: 'object' | 'string' | 'number' | 'boolean';
  name?: 'null' | 'String' | 'Number' | 'Boolean' | 'Date' | 'Object' | 'Array' | string;
  value?: null;
  transformer?: (v: any) => any;
  date?: boolean;
  array?: boolean;
  element?: IParsedSchema;
  object?: boolean;
  children?: Array<{
    key: string;
    schema: IParsedSchema;
  }>;
  multiple?: boolean;
  schemas?: IParsedSchema[];
  extra?: {
    default?: any;
    required?: boolean;
    min?: number;
    max?: number;
    match?: RegExp;
    invalid?: any[];
    enums?: any[];
  };
}

const parse = (schema: any, extra: {
  default?: any;
  required?: boolean;
  min?: number;
  max?: number;
  match?: RegExp;
  invalid?: any[];
  enums?: any[];
} = {}): IParsedSchema => {
  let s: IParsedSchema = {};
  if (typeof schema === 'undefined') {
    s = {};
    extra.required = false;
  } else if (schema === null) {
    s = { type: 'object', value: null, name: 'null' };
  } else if (schema === String) {
    s = {
      type: 'string', name: 'String',
      transformer: (v: string | Buffer) => {
        if (Buffer.isBuffer(v)) {
          return v.toString();
        }
        return v;
      },
    };
  } else if (schema === Number) {
    s = { type: 'number', name: 'Number' };
  } else if (schema === Boolean) {
    s = { type: 'boolean', name: 'Boolean' };
  } else if (schema === Date) {
    s = {
      type: 'object', name: 'Date', date: true,
      transformer: (v: Date | string | number) => {
        if (v instanceof Date) {
          return v;
        }
        return new Date(new Date(v as string).toISOString());
      },
    };
  } else if (schema === Array) {
    s = { type: 'object', name: 'Array', array: true };
  } else if (Array.isArray(schema)) {
    if (schema.length <= 1) {
      s = { type: 'object', name: 'Array', array: true };
      if (schema[0]) {
        s.element = parse(schema[0]);
      }
    } else {
      s = {
        multiple: true,
        schemas: schema.map(sc => parse(sc)),
      };
      s.name = s.schemas!.map(sc => sc.name).join('|');
    }
  } else if (schema === Object) {
    s = {
      type: 'object', name: 'Object', object: true, children: [],
      transformer: (v: object) => JSON.parse(JSON.stringify(v)),
    };
  } else if (isPureObject(schema)) {
    if ('type' in schema && !('type' in schema.type)) {
      const copy = Object.assign({}, schema);
      Reflect.deleteProperty(copy, 'type');
      return parse(schema.type, copy);
    } else {
      s = {
        type: 'object', name: 'Object', object: true,
        transformer: (v: object) => JSON.parse(JSON.stringify(v)),
        children: Object.keys(schema).map(key => {
          return {
            key,
            schema: parse(schema[key]),
          };
        }),
      };
    }
  }

  s.extra = extra;

  return s;
};

export default class Schema {
  private _schema: IParsedSchema;

  constructor(schema?: any) {
    this._schema = parse(schema);
  }

  public validate(value?: any): any {
    const newValue = this._validate(this._schema, value);
    if (isPureObject(newValue)) {
      return JSON.parse(JSON.stringify(newValue));
    } else {
      return newValue;
    }
  }

  public example() {
    return this._example(this._schema);
  }

  private _validate(schema: IParsedSchema, value?: any, key: string | number = 'v'): any {
    try {
      if (typeof value === 'undefined') {
        if ('default' in schema.extra!) {
          value = schema.extra!.default;
        }
      }
      if (typeof value === 'undefined') {
        assert(schema.extra!.required === false, 'is required');
        return;
      }
      if (!schema.object && !schema.array) {
        if (typeof value === 'undefined') {
          return;
        }
      }
      if ('transformer' in schema) {
        value = schema.transformer!(value);
      }
      if ('type' in schema) {
        assert(typeof value === schema.type);
      }
      if ('value' in schema) {
        assert(schema.value === value);
      }
      if (schema.type === 'number') {
        if ('min' in schema.extra!) {
          assert((value!) >= schema.extra!.min!, `should ≥ ${schema.extra!.min!}`);
        }
        if ('max' in schema.extra!) {
          assert((value!) <= schema.extra!.max!, `should ≤ ${schema.extra!.max!}`);
        }
      }
      if ('match' in schema.extra!) {
        assert(schema.extra!.match!.test(value as string), `not match ${schema.extra!.match}`);
      }
      if ('invalid' in schema.extra!) {
        assert(!schema.extra!.invalid!.includes(value), `should not in [${schema.extra!.invalid}]`);
      }
      if ('enums' in schema.extra!) {
        assert(schema.extra!.enums!.includes(value), `is not in [${schema.extra!.enums}]`);
      }
      if (schema.date) {
        assert(value instanceof Date);
      }
      if (schema.array) {
        assert(Array.isArray(value));
      }
      if (schema.multiple) {
        assert(schema.schemas!.some(s => {
          try {
            this._validate(s, value);
            return true;
          } catch (err) {
            return false;
          }
        }));
      }
      if (schema.object) {
        assert(isPureObject(value));
      }
      if ('children' in schema) {
        schema.children!.forEach(child =>
          (value as { [key: string]: any })[child.key] =
            this._validate(child.schema, (value as { [key: string]: any })[child.key], child.key));
      }
      if ('element' in schema) {
        (value as any[]).forEach((v, index) =>
          (value as any[])[index] = this._validate(schema.element!, v, index));
      }
      return value;
    } catch (error) {
      const newError: {
        originalMessage: string;
        isAssertionError?: boolean;
        routes?: Array<string | number>;
        message?: string;
        name?: string;
      } = {
        originalMessage: error.originalMessage,
      };
      if (error.name === 'AssertionError [ERR_ASSERTION]' || error.isAssertionError) {
        if (error.message === 'false == true') {
          newError.originalMessage = `not match [${schema.name}]`;
        } else {
          newError.isAssertionError = true;
          newError.originalMessage = error.originalMessage || error.message;
        }
      } else if (error.name !== 'ValidationError') {
        newError.originalMessage = `not match [${schema.name}]`;
      }
      newError.routes = error.routes || [];
      newError.routes!.unshift(key);
      let vstr = value as string;
      try {
        vstr = JSON.stringify(value).slice(0, 100);
      } catch (err) {
        // noop.
      }
      newError.message = `${newError.routes!.join('.')} ${newError.originalMessage}. v is ${vstr} ...`;
      newError.name = 'ValidationError';

      const err = new Error(newError.message);
      Object.assign(err, newError);

      throw err;
    }
  }

  private _example(schema: IParsedSchema): any {
    if (schema.name === 'null') {
      return null;
    }
    if ('default' in schema.extra!) {
      return schema.extra!.default;
    }
    if ('enums' in schema.extra! && schema.extra!.enums!.length > 0) {
      return schema.extra!.enums![0];
    }
    if (schema.name === 'String') {
      if ('match' in schema.extra!) {
        return `string matches ${schema.extra!.match}`;
      }
      return 'string';
    }
    if (schema.name === 'Number') {
      if ('min' in schema.extra!) {
        return schema.extra!.min;
      }
      if ('max' in schema.extra!) {
        return schema.extra!.max;
      }
      return 1206;
    }
    if (schema.name === 'Boolean') {
      return true;
    }
    if (schema.name === 'Date') {
      return new Date();
    }
    if (schema.name === 'Array') {
      if ('element' in schema) {
        return [this._example(schema.element!)];
      } else {
        return [];
      }
    }
    if (schema.multiple) {
      return this._example(schema.schemas![0]);
    }
    if (schema.name === 'Object') {
      return schema.children!.reduce((memo: {
        [key: string]: any;
      }, child) => {
        memo[child.key] = this._example(child.schema);
        return memo;
      }, {});
    }
  }

}

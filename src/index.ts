import Erz from 'erz';
import $, { Type } from './type';

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
    explain?: string;
    error?: string;
    disallowEmpty?: boolean;
  };
}

export interface ISummary {
  type: string;
  required: boolean;
  default?: any;
  enums?: any[];
  invalid?: any[];
  match?: string;
  min?: number;
  max?: number;
  element?: ISummary;
  alter?: ISummary[];
  object?: {
    [key: string]: ISummary;
  };
  explain?: string;
}

const parse = (schema: any | Type, extra: {
  default?: any;
  required?: boolean;
  min?: number;
  max?: number;
  match?: RegExp;
  invalid?: any[];
  enums?: any[];
  explain?: string;
  error?: string;
  disallowEmpty?: boolean;
} = {}): IParsedSchema => {
  if (schema instanceof Type) {
    schema = schema.schema;
  }
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
        if (v.length === 0 && extra.disallowEmpty) {
          return undefined;
        }
        if (Buffer.isBuffer(v)) {
          return v.toString();
        }
        return v;
      },
    };
  } else if (schema === Number) {
    s = {
      type: 'number', name: 'Number',
      transformer: (v: string | number) => {
        if (typeof v === 'number') {
          return v;
        }
        return parseFloat(v);
      },
    };
  } else if (schema === Boolean) {
    s = {
      type: 'boolean', name: 'Boolean',
      transformer(v: boolean | string | number) {
        if (typeof v === 'boolean') {
          return v;
        }
        if (['1', 1, 'true', 'T'].includes(v)) {
          return true;
        }
        if (['0', 0, 'false', 'F'].includes(v)) {
          return false;
        }
        return v;
      },
    };
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
    s = {
      type: 'object', name: 'Array', array: true,
      transformer(v: any[] | string) {
        if (Array.isArray(v)) {
          return v;
        }
        try {
          return JSON.parse(v);
        } catch (e) {
          return v;
        }
      },
    };
  } else if (Array.isArray(schema)) {
    if (schema.length <= 1) {
      s = {
        type: 'object', name: 'Array', array: true,
        transformer(v: any[] | string) {
          if (Array.isArray(v)) {
            return v;
          }
          try {
            return JSON.parse(v);
          } catch (e) {
            return v;
          }
        },
      };
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
      transformer: (v: object | string) => {
        if (typeof v === 'string') {
          try {
            return JSON.parse(v);
          } catch (e) {
            return v;
          }
        }
        return JSON.parse(JSON.stringify(v));
      },
    };
  } else if (isPureObject(schema)) {
    if ('$type' in schema) {
      const copy = Object.assign({}, schema);
      Reflect.deleteProperty(copy, '$type');
      return parse(schema.$type, copy);
    } else if ('type' in schema && !('type' in schema.type) && !(schema.type instanceof Type)) {
      const copy = Object.assign({}, schema);
      Reflect.deleteProperty(copy, 'type');
      return parse(schema.type, copy);
    } else {
      s = {
        type: 'object', name: 'Object', object: true,
        transformer: (v: object | string) => {
          if (typeof v === 'string') {
            try {
              return JSON.parse(v);
            } catch (e) {
              return v;
            }
          }
          return JSON.parse(JSON.stringify(v));
        },
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

  constructor(schema?: any | Type) {
    this._schema = parse(schema);
  }

  public validate(value?: any): any {
    return this._validate(this._schema, value);
  }

  public example() {
    return this._example(this._schema);
  }

  public summary() {
    return JSON.parse(JSON.stringify(this._summary(this._schema)));
  }

  private _validate(schema: IParsedSchema, value?: any, key: string | number = 'v'): any {
    try {
      if (typeof value === 'undefined') {
        if ('default' in schema.extra!) {
          value = schema.extra!.default;
        }
      }
      if (typeof value === 'undefined') {
        if (schema.extra!.required !== false) {
          throw new Erz('is required', -1);
        }
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
        if (typeof value !== schema.type) {
          throw new Erz('');
        }
      }
      if ('value' in schema) {
        if (schema.value !== value) {
          throw new Erz('');
        }
      }
      if (schema.type === 'number') {
        if (Number.isNaN(value)) {
          throw new Erz('is not a number', -1);
        }
        if ('min' in schema.extra!) {
          if ((value!) < schema.extra!.min!) {
            throw new Erz(`should ≥ ${schema.extra!.min!}`, -1);
          }
        }
        if ('max' in schema.extra!) {
          if ((value!) > schema.extra!.max!) {
            throw new Erz(`should ≤ ${schema.extra!.max!}`, -1);
          }
        }
      }
      if ('match' in schema.extra!) {
        if (!schema.extra!.match!.test(value as string)) {
          throw new Erz(`not match ${schema.extra!.match}`, -1);
        }
      }
      if ('invalid' in schema.extra!) {
        if (schema.extra!.invalid!.includes(value)) {
          throw new Erz(`should not in [${schema.extra!.invalid}]`, -1);
        }
      }
      if ('enums' in schema.extra!) {
        if (!schema.extra!.enums!.includes(value)) {
          throw new Erz(`is not in ${JSON.stringify(schema.extra!.enums)}`, -1);
        }
      }
      if (schema.date) {
        if (!(value instanceof Date)) {
          throw new Erz('');
        }
      }
      if (schema.array) {
        if (!Array.isArray(value)) {
          throw new Erz('');
        }
      }
      if (schema.multiple) {
        if (!schema.schemas!.some(s => {
          try {
            this._validate(s, value);
            return true;
          } catch (err) {
            return false;
          }
        })) {
          throw new Erz('');
        }
      }
      if (schema.object) {
        if (!isPureObject(value)) {
          throw new Erz('');
        }
      }
      if ('children' in schema) {
        if (schema.children!.length > 0) {
          const obj: { [key: string]: any } = {};
          schema.children!.forEach(child => {
            const v = this._validate(child.schema, (value as { [key: string]: any })[child.key], child.key);
            if (v !== undefined) {
              obj[child.key] = v;
            }
          });
          value = obj;
        }
      }
      if ('element' in schema) {
        (value as any[]).forEach((v, index) =>
          (value as any[])[index] = this._validate(schema.element!, v, index));
      }
      return value;
    } catch (error) {
      const newError: {
        originalMessage: string;
        isCustomError?: boolean;
        routes?: Array<string | number>;
        message?: string;
        name?: string;
      } = {
        originalMessage: error.originalMessage,
        isCustomError: error.isCustomError,
      };

      newError.routes = error.routes || [];
      newError.routes!.unshift(key);

      if (error.name !== 'ValidationError') {
        const customError = schema.extra!.error;
        if (customError) {
          newError.originalMessage = customError;
          newError.message = customError;
          newError.isCustomError = true;
        } else if (error.name === Erz) {
          if (error.code === -1) {
            newError.originalMessage = `not match [${schema.name}]`;
          } else {
            newError.originalMessage = error.message;
          }
        } else {
          newError.originalMessage = `not match [${schema.name}]`;
        }
      }

      if (!newError.isCustomError) {
        let vstr = value as string;
        try {
          vstr = JSON.stringify(value);
        } catch (err) {
          // noop.
        }
        newError.message = `${newError.routes!.join('.')} ${newError.originalMessage}. v is ${vstr}`;
      } else {
        newError.message = newError.originalMessage;
      }

      newError.name = 'ValidationError';

      const err = new Error(newError.message);
      Object.assign(err, newError);

      throw err;
    }
  }

  private _summary(schema: IParsedSchema): any {
    const su: ISummary = {
      type: String(schema.name),
      required: schema.extra!.required !== false,
      explain: schema.extra!.explain,
    };
    if ('default' in schema.extra!) {
      su.default = schema.extra!.default;
    }
    if ('enums' in schema.extra! && schema.extra!.enums!.length > 0) {
      su.enums = schema.extra!.enums;
    }
    if ('invalid' in schema.extra! && schema.extra!.invalid!.length > 0) {
      su.invalid = schema.extra!.invalid;
    }
    if (schema.name === 'String' && 'match' in schema.extra!) {
      su.match = String(schema.extra!.match);
    }
    if (schema.name === 'Number') {
      su.max = schema.extra!.max;
      su.min = schema.extra!.min;
    }
    if (schema.name === 'Array' && 'element' in schema) {
      su.element = this._summary(schema.element!);
    }
    if (schema.multiple) {
      su.type = 'Alter';
      su.alter = schema.schemas!.map(this._summary.bind(this));
    }
    if (schema.name === 'Object') {
      su.object = schema.children!.reduce((memo, child) => {
        memo[child.key] = this._summary(child.schema);
        return memo;
      }, {} as { [key: string]: ISummary });
    }
    return su;
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

export const RequiredString = $(String).required();

export const RequiredNumber = $(Number).required();

export const RequiredDate = $(Date).required();

export const RequiredBoolean = $(Boolean).required();

export const OptionalString = $(String).optional();

export const OptionalNumber = $(Number).optional();

export const OptionalDate = $(Date).optional();

export const OptionalBoolean = $(Boolean).optional();

export { $, Type };

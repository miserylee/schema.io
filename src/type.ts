export class Type {
  public schema: {
    enums?: any[];
    invalid?: any[];
    match?: RegExp;
    max?: number;
    min?: number;
    default?: any;
    required: boolean;
    $type: any;
    type: any;
    explain?: string;
    error?: string;
    disallowEmpty?: boolean;
  };

  constructor(T: any) {
    if (T instanceof Type) {
      this.schema = { ...T.schema };
    } else {
      this.schema = {
        $type: T,
        type: T,
        required: true,
      };
    }
  }

  public default(value: any) {
    this.schema.default = value;
    return this;
  }

  public required() {
    this.schema.required = true;
    return this;
  }

  public optional() {
    this.schema.required = false;
    return this;
  }

  public min(value: number) {
    this.schema.min = value;
    return this;
  }

  public max(value: number) {
    this.schema.max = value;
    return this;
  }

  public match(reg: RegExp) {
    this.schema.match = reg;
    return this;
  }

  public invalid(values: any[]) {
    this.schema.invalid = values;
    return this;
  }

  public enums(values: any[]) {
    this.schema.enums = values;
    return this;
  }

  public explain(explain: string) {
    this.schema.explain = explain;
    return this;
  }

  public error(error: string) {
    this.schema.error = error;
    return this;
  }

  public mix(obj: { [key: string]: any } | Type) {
    this.schema = {
      ...this.schema,
      ...(obj instanceof Type ? obj.schema : obj),
    };
    return this;
  }

  public disallowEmpty() {
    this.schema.disallowEmpty = true;
    return this;
  }
}

export default function $(T?: any) {
  return new Type(T);
}

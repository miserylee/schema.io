# schema.io

##  ![NPM version](https://img.shields.io/npm/v/schema.io.svg?style=flat)

### 1. 这是什么？

`schema.io`是一个`js`基本数据结构的校验库。

### 2. 业务场景？

`schema.io`可用于所有需要在运行时对结构化数据进行校验的场景；如http请求的参数校验等。

### 3. 怎么使用？

```js
// 使用 yarn 或 npm 进行安装后导入
import Schema from 'schema.io';

// 创建结构化的数据模板用于校验
const schemaType = {
  foo: String,
  bar: Number,
  complex: [{
    key: {
      foobar: Boolean,
    },
  }]
};

// 创建校验器实例
const schema = new Schema(schemaType);

// 进行数据校验
try {
  const parsedValue = schema.validate(value);
} catch(e) {
  // 校验错误
}
```

### 4. 支持的数据结构

`null` `String` `Number` `Boolean` `Date` `Object` `{} *alias Object*` `Array` `[] *alias Array*`

可以通过使用`{}`和`[]`嵌套更加复杂的数据结构。

**注意：当使用`[...elements]`来声明数据结构时，若数组长度大于1，则被解释为【满足数组中任一模板】，此时不作为数组校验。**

如：`[String]`表示校验数据为数组，并且每一项为字符串；`[String, Number]`表示校验数据为字符串或数字；`[[String, Number]]`则表示校验数据为数组，并且每一项为字符串或数字。

### 5. 怎么写模板？

- 直接使用上述支持的数据结构组合模板

```
// 举个栗子
String // 匹配字符串
[Number] // 匹配数字数组
{foo: Boolean} // 匹配对象，含有一个成员foo的类型是布尔值
[Number, {key: String}] // 匹配数字 或者 含有成员key为字符串的对象
```

- 使用结构化的模板声明方式

```
const schemaType = {
    type: any; // 定义匹配的类型。可以是支持的基本数据结构，也可以是结构化的模板声明
    $type: any; // alias: type  为了避免特定情况下对象数据结构的key冲突，推荐使用这种方式代替type
    enums?: any[]; // 定义匹配的枚举值
    invalid?: any[]; // 定义不可匹配的值
    match?: RegExp; // 定义匹配的正则表达式（针对于字符串）
    disallowEmpty?: boolean; // 定义是否允许空字符串（针对于字符串）
    max?: number; // 定义最大值（针对于数字）
    min?: number; // 定义最小值（针对于数字）
    default?: any; // 定义默认值
    required: boolean; // 定义匹配值是否可以为undefined
    explain?: string; // 定义模板的描述
    error?: string; // 定义匹配失败时的自定义错误信息
}
```

- 使用Type生成器快速生成模板

```js
import { $, Type } from 'schema.io';

const schemaType1 = new Type({
  foo: String,
}).required().explain('schema type 1');

const schemaType2 = $(String).optional().explain('schema type 2');
```


### 6. 附加功能

##### Schema.example()

根据提供的数据结构校验器，生成符合模板的数据。

```js
const exampleData = new Schema(schemaType).example()
```

##### Schema.summary()

根据提供的数据结构校验器，生成结构化的数据模板描述。可用于生成数据结构文档。

```js
const summary = new Schema(schemaType).summary()
```

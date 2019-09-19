import * as assert from 'assert';
import Schema from '../src';
import $ from '../src/type';

const assertThrowError = (fn: (...args: any[]) => void, done: any) => {
  try {
    fn();
    done(new Error('failed'));
  } catch (err) {
    console.error(err);
    done();
  }
};

describe('Schema validation', () => {
  it('should ok', () => {

    new Schema().validate();
    new Schema().validate('string');
    new Schema().validate(123);
    new Schema($()).validate();
    new Schema(null).validate(null);
    new Schema($(null)).validate(null);
    new Schema(String).validate('');
    new Schema($(String)).validate('');
    new Schema($(String).optional()).validate();
    new Schema(String).validate('Hello');
    new Schema(String).validate(Buffer.from('World'));
    new Schema(Number).validate(0);
    new Schema(Number).validate(12);
    new Schema(Number).validate(Infinity);
    new Schema(Boolean).validate(true);
    new Schema(Date).validate(new Date());
    new Schema(Date).validate(Date.now());
    new Schema(Date).validate(new Date().toISOString());
    new Schema(Array).validate([]);
    new Schema(Array).validate([1, 2, 3]);
    new Schema([]).validate(['apple', 'pear', 'cheery']);
    new Schema([]).validate(Array.from('Hello'));
    new Schema(Object).validate({});
    new Schema({}).validate({});
    new Schema({ a: String }).validate({
      a: '1',
    });
    new Schema([String]).validate(['Hello', 'world']);
    new Schema([String, Number]).validate('Hello');
    new Schema([[String, Number]]).validate(['price', 200]);
    new Schema([[$(Object).optional(), null]]).validate([null]);
    new Schema([{}]).validate([{
      a: 'b',
    }]);
    new Schema([{
      key: { type: String, valid: ['1', '2'] },
    }]).validate([{
      key: '1',
    }, {
      key: '2',
    }]);
    new Schema($([$({
      key: $(String).enums(['1', '2']),
    })])).validate([{
      key: '1',
    }]);
    new Schema({
      key1: String,
      key2: Number,
    }).validate({
      key1: 'a',
      key2: 1,
    });
    new Schema({
      arr: [],
    }).validate({
      arr: [1, 2, 3],
    });
    new Schema({
      type: Number,
      max: 10,
      min: 1,
    }).validate(5);
    new Schema({ str: $(String).optional() }).validate({});
  });

  it('output should ok', () => {
    const schema = new Schema({
      name: String,
      tel: { type: String, required: true, match: /[0-9]{11}/ },
      gender: { type: String, enums: ['male', 'female'], default: 'male' },
      birth: Date,
      hobbit: [[String, Number]],
      hometown: {
        province: { type: String, required: true },
        city: String,
      },
    });
    assert(JSON.stringify(schema.validate({
      name: '张三',
      tel: '15888888888',
      birth: '1992-11-22',
      hobbit: ['game'],
      hometown: {
        province: '湖北',
        city: '武汉',
      },
    })) === JSON.stringify({
      name: '张三',
      tel: '15888888888',
      gender: 'male',
      birth: '1992-11-22T00:00:00.000Z',
      hobbit: ['game'],
      hometown: { province: '湖北', city: '武汉' },
    }));

    console.log(schema.example());
    console.log(JSON.stringify(schema.summary(), null, 2));

    console.log(new Schema({
      type: { type: String },
    }).example());

    console.log(new Schema({
      arr: [],
      arr2: Array,
      multiple: [String, Number],
    }).example());

    new Schema([{
      _id: String,
      path: {
        $type: {
          type: { type: String },
          coordinates: [[[Number]]],
        },
        required: false,
      },
    }, null]).validate({
      '_id': '1703110248001',
      'path': { 'type': 'Polygon', 'coordinates': [[[114.338735, 30.474982], [114.340179, 3]]] },
    });
  });
});

describe('Invalidation', () => {
  it('should failed', done => {
    const schema = new Schema([{
      lng: { type: Number, max: 180, min: -180 },
      lat: { type: Number, max: 90, min: -90 },
    }]);

    assertThrowError(() => {
      schema.validate([{
        B: 123456,
        L: 123456,
      }]);
    }, done);
  });

  it('should failed', done => {
    const schema = new Schema({
      geometry: {
        type: { type: String },
        coordinates: [[Number]],
      },
    });

    assertThrowError(() => {
      schema.validate({
        geometry: {
          type: 'Point',
          coordinates: [114, 30],
        },
      });
    }, done);
  });

  it('should failed', done => {
    const schema = new Schema($(String).disallowEmpty());
    assertThrowError(() => {
      schema.validate('');
    }, done);
  });
});

describe('Transform', () => {
  it('should ok', () => {
    assert(new Schema(Number).validate('1') === 1);
    assert(new Schema(Boolean).validate('T') === true);
    assert(new Schema(Boolean).validate(0) === false);
    assert(new Schema(Date).validate(Date.now()) instanceof Date);
    assert(Array.isArray(new Schema(Array).validate('["1", "2"]')));
    assert(Array.isArray(new Schema([Number]).validate('["1", 2]')));
    assert(new Schema(Object).validate('{"foo":"bar"}').foo === 'bar');
    assert(new Schema({ foo: Boolean }).validate('{"foo":"false"}').foo === false);
  });
});

describe('Custom Error', () => {
  it('😝', () => {
    const errorMessage = 'elements of arr should be numbers.';
    const schema = new Schema({
      arr: [$(Number).error(errorMessage)],
    });
    try {
      schema.validate({
        arr: [1, 'Hello'],
      });
    } catch (e) {
      assert(e.message === errorMessage);
    }
  });
});

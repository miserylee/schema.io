import * as assert from 'assert';
import Schema from '../src';

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
    new Schema(null).validate(null);
    new Schema(String).validate('');
    new Schema(String).validate('Hello');
    new Schema(String).validate(Buffer.from('World'));
    new Schema(Number).validate(0);
    new Schema(Number).validate(12);
    new Schema(Number).validate(NaN);
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
  });

  it('output should ok', () => {
    const schema = new Schema({
      name: String,
      tel: { type: String, required: true, match: /[0-9]{11}/ },
      gender: { type: String, enums: ['male', 'female'], default: 'male' },
      birth: Date,
      hobbit: [String],
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
      birth: '1992-11-22T00:00:00.000Z',
      hobbit: ['game'],
      hometown: { province: '湖北', city: '武汉' },
      gender: 'male',
    }));

    console.log(schema.example());

    console.log(new Schema({
      type: { type: String },
    }).example());

    console.log(new Schema({
      arr: [],
      arr2: Array,
      multiple: [String, Number],
    }).example());
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
});

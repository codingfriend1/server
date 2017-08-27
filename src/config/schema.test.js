const schema = require('./schema');
const parse = require('./parse');

describe('schema', () => {
  it('uses the defaults', async () => {
    expect(await parse(schema)).toMatchObject({ port: 3000 });
    expect(await parse(schema, {})).toMatchObject({ port: 3000 });
  });

  it('uses the __root', async () => {
    expect(await parse(schema, 2000)).toMatchObject({ port: 2000 });
  });

  it('can use a plain object', async () => {
    expect(await parse(schema, { port: 2000 })).toMatchObject({ port: 2000 });
  });

  it('can use the argument', async () => {
    const opts = await parse({ public: { arg: true } }, { public: 'abc' });
    expect(opts.public).toBe('abc');
  });

  it('can use the ENV', async () => {
    expect(await parse(schema, { port: 2000 }, { PORT: 1000 })).toMatchObject({ port: 1000 });
    expect(await parse({ port: { env: true } }, { port: 2000 }, { PORT: 1000 })).toMatchObject({ port: 1000 });
  });

  it('just works with false env and no env', async () => {
    const opts = await parse({ public: { env: false }}, { public: 'abc' });
    expect(opts.public).toBe('abc');
  });

  it('accepts required with value', async () => {
    const opts = await parse({ public: { required: true } }, { public: 'abc' });
    expect(opts.public).toBe('abc');
  });

  it('environment wins params', async () => {
    const opts = await parse(schema, { public: 'aaa' }, { PUBLIC: 'abc' });
    expect(opts.public).toMatch(/\/abc/);
  });

  it('can handle several types', async () => {
    expect((await parse(schema, { public: false })).public).toBe(false);
    expect((await parse(schema, { public: 'abc' })).public).toMatch(/\/abc/);
  });

  it('rejects on incorrect types', async () => {
    const pub = parse(schema, { public: 25 });
    await expect(pub).rejects.toMatchObject({ code: '/server/options/type' });

    const port = parse(schema, { port: '25' });
    await expect(port).rejects.toMatchObject({ code: '/server/options/type' });
  });

  it('can handle NODE_ENV', async () => {
    expect(await parse(schema, {}, { NODE_ENV: 'development' })).toMatchObject({ env: 'development' });
    expect(await parse(schema, {}, { NODE_ENV: 'test' })).toMatchObject({ env: 'test' });
    expect(await parse(schema, {}, { NODE_ENV: 'production' })).toMatchObject({ env: 'production' });
  });

  it('throws with wrong value', async () => {
    const env = parse(schema, {}, { NODE_ENV: 'abc' });
    await expect(env).rejects.toMatchObject({ code: '/server/options/enum' });
  });

  it('no `__root` should be given no root', async () => {
    const env = parse({}, 'hello');
    await expect(env).rejects.toMatchObject({ code: '/server/options/notobject' });
  });

  it('no `arg` should be given no arg', async () => {
    const arg = parse(schema, { env: 'development' });
    await expect(arg).rejects.toMatchObject({ code: '/server/options/noarg' });
  });

  it('no `env` should be given no env', async () => {
    const env = parse({ public: { env: false }}, {}, { PUBLIC: 'hello' });
    await expect(env).rejects.toMatchObject({ code: '/server/options/noenv' });
  });

  it('throws with no value for required', async () => {
    const env = parse({ public: { required: true } });
    await expect(env).rejects.toMatchObject({ code: '/server/options/required' });
  });

  it('does a validation', async () => {
    const validate = () => {
      let err = new Error('Hello world');
      err.code = '/server/options/fakeerror';
      return err;
    };
    const env = parse({ public: { validate } }, {}, { PUBLIC: 'hello' });
    await expect(env).rejects.toMatchObject({ code: '/server/options/fakeerror' });
  });

  it('expects the validation to return truthy', async () => {
    const opts = await parse({ public: { validate: () => true } }, { public: 'hello' });
    expect(opts.public).toBe('hello');
  });

  it('expects the validation not to return false', async () => {
    const env = parse({ public: { validate: () => false } });
    await expect(env).rejects.toMatchObject({ code: '/server/options/validate' });
  });
});
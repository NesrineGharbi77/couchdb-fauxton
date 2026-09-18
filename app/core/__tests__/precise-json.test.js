// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

import { LosslessInteger, parse, stringify } from '../precise-json';

describe('precise-json', () => {
  it('preserves an integer larger than Number.MAX_SAFE_INTEGER', () => {
    const text = '{"huge":9223372036854775807}';
    const parsed = parse(text);

    expect(parsed.huge).toBeInstanceOf(LosslessInteger);
    expect(parsed.huge.toString()).toEqual('9223372036854775807');
    expect(stringify(parsed)).toEqual(text);
  });

  it('keeps safe integers and decimal values as regular numbers', () => {
    const parsed = parse('{"safe":9007199254740991,"ratio":3.14}');

    expect(parsed.safe).toEqual(9007199254740991);
    expect(parsed.ratio).toEqual(3.14);
  });

  it('does not treat digits inside strings as numbers', () => {
    const parsed = parse('{"text":"9223372036854775807"}');

    expect(parsed.text).toEqual('9223372036854775807');
  });

  it('preserves nested positive and negative large integers', () => {
    const parsed = parse('{"values":[9223372036854775807,-9223372036854775808]}');
    const output = stringify(parsed, null, '  ');

    expect(parsed.values[0].toString()).toEqual('9223372036854775807');
    expect(parsed.values[1].toString()).toEqual('-9223372036854775808');
    expect(output).toContain('9223372036854775807');
    expect(output).toContain('-9223372036854775808');
  });
});

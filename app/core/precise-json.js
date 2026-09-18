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

const MAX_SAFE_INTEGER_TEXT = '9007199254740991';
const LOSSLESS_INTEGER_KEY = '__fauxton_lossless_integer_7d31f4d5__';

export class LosslessInteger {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

const isDigit = (char) => char >= '0' && char <= '9';

const isUnsafeIntegerToken = (token) => {
  if (token.includes('.') || token.includes('e') || token.includes('E')) {
    return false;
  }

  const digits = token.startsWith('-') ? token.slice(1) : token;
  return digits.length > MAX_SAFE_INTEGER_TEXT.length ||
    (digits.length === MAX_SAFE_INTEGER_TEXT.length && digits > MAX_SAFE_INTEGER_TEXT);
};

const protectUnsafeIntegers = (text) => {
  let output = '';
  let inString = false;
  let escaped = false;
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      index += 1;
      continue;
    }

    if (char === '"') {
      inString = true;
      output += char;
      index += 1;
      continue;
    }

    if (char === '-' || isDigit(char)) {
      const match = text.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (match) {
        const token = match[0];
        if (isUnsafeIntegerToken(token)) {
          output += `{"${LOSSLESS_INTEGER_KEY}":${JSON.stringify(token)}}`;
        } else {
          output += token;
        }
        index += token.length;
        continue;
      }
    }

    output += char;
    index += 1;
  }

  return output;
};

const restoreLosslessInteger = (_key, value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === LOSSLESS_INTEGER_KEY &&
        typeof value[LOSSLESS_INTEGER_KEY] === 'string') {
      return new LosslessInteger(value[LOSSLESS_INTEGER_KEY]);
    }
  }
  return value;
};

export const parse = (text) => {
  return JSON.parse(protectUnsafeIntegers(text), restoreLosslessInteger);
};

const getIndent = (space) => {
  if (typeof space === 'number') {
    return ' '.repeat(Math.min(10, Math.max(0, space)));
  }
  if (typeof space === 'string') {
    return space.slice(0, 10);
  }
  return '';
};

const serialize = (value, indent, depth, seen, inArray) => {
  if (value instanceof LosslessInteger) {
    return value.toString();
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? JSON.stringify(value) : 'null';
  }

  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    return inArray ? 'null' : undefined;
  }

  if (value && typeof value.toJSON === 'function') {
    return serialize(value.toJSON(), indent, depth, seen, inArray);
  }

  if (seen.has(value)) {
    throw new TypeError('Converting circular structure to JSON');
  }
  seen.add(value);

  const currentIndent = indent.repeat(depth);
  const childIndent = indent.repeat(depth + 1);
  let result;

  if (Array.isArray(value)) {
    const items = value.map(item => serialize(item, indent, depth + 1, seen, true));
    if (!indent) {
      result = '[' + items.join(',') + ']';
    } else if (items.length === 0) {
      result = '[]';
    } else {
      result = '[\n' + childIndent + items.join(',\n' + childIndent) +
        '\n' + currentIndent + ']';
    }
  } else {
    const items = Object.keys(value)
      .map(key => {
        const serialized = serialize(value[key], indent, depth + 1, seen, false);
        if (serialized === undefined) {
          return undefined;
        }
        const separator = indent ? ': ' : ':';
        return JSON.stringify(key) + separator + serialized;
      })
      .filter(item => item !== undefined);

    if (!indent) {
      result = '{' + items.join(',') + '}';
    } else if (items.length === 0) {
      result = '{}';
    } else {
      result = '{\n' + childIndent + items.join(',\n' + childIndent) +
        '\n' + currentIndent + '}';
    }
  }

  seen.delete(value);
  return result;
};

export const stringify = (value, _replacer = null, space = undefined) => {
  return serialize(value, getIndent(space), 0, new Set(), false);
};

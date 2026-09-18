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

import Backbone from 'backbone';
import sinon from 'sinon';
import Documents from '../shared-resources';

describe('Documents.Doc large integer handling', () => {
  let ajaxStub;

  afterEach(() => {
    if (ajaxStub) {
      ajaxStub.restore();
      ajaxStub = null;
    }
  });

  it('round-trips a large integer without changing its digits', () => {
    const bigInteger = '9223372036854775807';
    const roundedInteger = '9223372036854776000';
    let savedBody;
    let readAsText = false;

    ajaxStub = sinon.stub(Backbone, 'ajax').callsFake(options => {
      if (options.type === 'GET') {
        readAsText = options.dataType === 'text';
        options.success(
          `{"_id":"large-int-test","_rev":"1-abc","hugeNumber":${bigInteger}}`
        );
      } else {
        savedBody = options.data;
        options.success({ok: true, id: 'large-int-test', rev: '2-def'});
      }
      return {done() {}, fail() {}};
    });

    const doc = new Documents.Doc(
      {_id: 'large-int-test'},
      {database: {id: 'db', safeID: () => 'db'}}
    );
    doc.url = () => '/db/large-int-test';

    doc.fetch();
    expect(readAsText).toEqual(true);
    expect(doc.get('hugeNumber').toString()).toEqual(bigInteger);
    expect(doc.prettyJSON()).toContain(bigInteger);

    doc.save();
    expect(savedBody).toContain(bigInteger);
    expect(savedBody).not.toContain(roundedInteger);
  });
});

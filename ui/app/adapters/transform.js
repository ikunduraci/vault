import { assign } from '@ember/polyfills';
import { resolve, allSettled } from 'rsvp';
import ApplicationAdapter from './application';
import { encodePath } from 'vault/utils/path-encoding-helpers';

export default ApplicationAdapter.extend({
  // TODO this adapter was copied over, much of this stuff may or may not need to be here.
  namespace: 'v1',

  // defaultSerializer: 'role',

  createOrUpdate(store, type, snapshot) {
    const serializer = store.serializerFor('transform'); // TODO replace transform with type.modelName
    const data = serializer.serialize(snapshot);
    const { id } = snapshot;
    let url = this.urlForTransformations(snapshot.record.get('backend'), id);

    return this.ajax(url, 'POST', { data });
  },

  createRecord() {
    return this.createOrUpdate(...arguments);
  },

  updateRecord() {
    return this.createOrUpdate(...arguments, 'update');
  },

  deleteRecord(store, type, snapshot) {
    const { id } = snapshot;
    return this.ajax(this.urlForRole(snapshot.record.get('backend'), id), 'DELETE');
  },

  pathForType() {
    return 'transform';
  },

  urlForAlphabet(backend, id) {
    let url = `${this.buildURL()}/${encodePath(backend)}/alphabet`;
    if (id) {
      url = url + '/' + encodePath(id);
    }
    return url;
  },

  urlForTransformations(backend, id) {
    let url = `${this.buildURL()}/${encodePath(backend)}/transformation`;
    if (id) {
      url = url + '/' + encodePath(id);
    }
    return url;
  },

  optionsForQuery(id) {
    let data = {};
    if (!id) {
      data['list'] = true;
    }
    return { data };
  },

  fetchByQuery(store, query) {
    const { id, backend } = query;
    let zeroAddressAjax = resolve();
    const queryAjax = this.ajax(this.urlForTransformations(backend, id), 'GET', this.optionsForQuery(id));
    // TODO: come back to why you need this, carry over.
    // if (!id) {
    //   zeroAddressAjax = this.findAllZeroAddress(store, query);
    // }

    return allSettled([queryAjax, zeroAddressAjax]).then(results => {
      // query result 404d, so throw the adapterError
      if (!results[0].value) {
        throw results[0].reason;
      }
      let resp = {
        id,
        name: id,
        backend,
        data: {},
      };

      results.forEach(result => {
        if (result.value) {
          if (result.value.data.roles) {
            resp.data = assign({}, resp.data, { zero_address_roles: result.value.data.roles });
          } else {
            resp.data = assign({}, resp.data, result.value.data);
          }
        }
      });
      return resp;
    });
  },

  findAllZeroAddress(store, query) {
    const { backend } = query;
    const url = `/v1/${encodePath(backend)}/config/zeroaddress`;
    return this.ajax(url, 'GET');
  },

  query(store, type, query) {
    return this.fetchByQuery(store, query);
  },

  queryRecord(store, type, query) {
    return this.fetchByQuery(store, query);
  },
});

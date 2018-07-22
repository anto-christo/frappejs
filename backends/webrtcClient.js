const frappe = require('frappejs');
const Observable = require('frappejs/utils/observable');

module.exports = class WebRTCClient extends Observable {

  async insert(doctype, docObj) {
    var doc = this.getBasicDoc(docObj);
    const obj = {
      method: 'insert',
      payload: [doctype, doc]
    };
    return await frappe.webRTC.sendRequest(obj);
  }

  async get(doctype, name) {
    const obj = {
      method: 'get',
      payload: [doctype, name]
    };
    return await frappe.webRTC.sendRequest(obj);
  } 

  async getAll({ doctype, fields, filters, start, limit, sort_by, order }) {
    const obj = {
      method: 'getAll',
      payload: [{doctype, fields, filters, start, limit, sort_by, order}]
    };
    return await frappe.webRTC.sendRequest(obj);
  }

  async update(doctype, docObj) {
    var doc = this.getBasicDoc(docObj);
    const obj = {
      method: 'update',
      payload: [doctype, doc]
    };
    return await frappe.webRTC.sendRequest(obj);
  }

  async delete(doctype, name) {
    const obj = {
      method: 'delete',
      payload: [doctype, name]
    };
    return await frappe.webRTC.sendRequest(obj);
  }

  async deleteMany(doctype, names) {
    const obj = {
      method: 'deleteMany',
      payload: [doctype, names]
    };
    return await frappe.webRTC.sendRequest(obj);
  }

  async exists(doctype, name) {
    const obj = {
      method: 'exists',
      payload: [doctype, name]
    };
    return (await frappe.webRTC.sendRequest(obj)) ? true : false;
  }

  async getValue(doctype, name, fieldname) {
    const obj = {
      method: 'getValue',
      payload: [doctype, name, fieldname]
    };
    return await frappe.webRTC.sendRequest(obj);
  }

  getBasicDoc(docObj){
    var doc = {};
    for(var i in docObj._meta.fields){
        var field_name = docObj._meta.fields[i].fieldname;
        if(field_name && docObj[field_name]){
            doc[field_name] = docObj[field_name];
        }
    }
    return doc;
  }
}
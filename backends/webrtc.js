const frappe = require('frappejs');
const Observable = require('frappejs/utils/observable');

module.exports = class WebRTCClient extends Observable {
  constructor(){
    super();
    this.initTypeMap();
  }

  async insert(doctype, doc) {
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

  async update(doctype, doc) {
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

  initTypeMap() {
    this.typeMap = {
        'Autocomplete': true
        , 'Currency': true
        , 'Int': true
        , 'Float': true
        , 'Percent': true
        , 'Check': true
        , 'Small Text': true
        , 'Long Text': true
        , 'Code': true
        , 'Text Editor': true
        , 'Date': true
        , 'Datetime': true
        , 'Time': true
        , 'Text': true
        , 'Data': true
        , 'Link': true
        , 'DynamicLink': true
        , 'Password': true
        , 'Select': true
        , 'Read Only': true
        , 'File': true
        , 'Attach': true
        , 'Attach Image': true
        , 'Signature': true
        , 'Color': true
        , 'Barcode': true
        , 'Geolocation': true
    }
  }
}
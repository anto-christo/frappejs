const frappe = require('frappejs');
const Observable = require('frappejs/utils/observable');

module.exports = class WebRTCClient extends Observable {

  async getAll({ doctype, fields, filters, start, limit, sort_by, order }) {
    const obj = {
      method: 'getAll',
      payload: [{doctype, fields, filters, start, limit, sort_by, order}],
    };

    return await frappe.webRTC.sendRequest(obj);
  }
}
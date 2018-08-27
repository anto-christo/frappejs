const utils = require('frappejs/utils');
const Observable = require('frappejs/utils/observable');
const frappe = require('frappejs');

module.exports = class WebRTC {
    constructor(socket){
        this.dataChannels = {};
        this.connections = {};
        this.pendingRequests = {};
        this.events = new Observable();
        this.masterNode;
        this.uniqueId;
        this.socket = socket;
        // this.iceServers = {
        //     'iceServers': [{
        //             'url': 'stun:stun.services.mozilla.com'
        //         },
        //         {
        //             'url': 'stun:stun.l.google.com:19302'
        //         }
        //     ]
        // };
        this.iceServers = {
            'iceServers': [{
                    url: 'turn:192.168.0.104:3478',
                    username: 'frappe',
                    credential: 'frappe'
                },
            ]
        };
        this.setupSocketHandlers();
    }

    startServer(name){
        var that = this;
        frappe.getSingle('ServerSettings').then(serverSettings => {
            console.log(serverSettings.serverName);
            if(serverSettings.serverName == name || serverSettings.serverName == undefined){
                that.socket.emit('startServer',{name:name, key:serverSettings.serverKey, socketID:that.uniqueId});
            }
        });
    }

    stopServer(name){
        console.log('stop called');
        var that = this;
        frappe.getSingle('ServerSettings').then(serverSettings => {
            console.log(serverSettings.serverName);
            if(serverSettings.serverName == name){
                that.socket.emit('stopServer',{name:name, socketID:that.uniqueId});
            }
        });
    }

    startConnection(masterName){
        this.socket.emit('create', masterName);
    }

    stopConnection(){
        var stop = JSON.stringify({
            webrtcConn:{
                type: 'stop',
                id: this.uniqueId
            }
        });
        this.sendData(stop, this.masterNode);
        this.removeConnection(this.masterNode);
    }

    setupSocketHandlers(){
        var that = this;
        this.socket.on('giveID',function(id){
            that.uniqueId = id;
            if (typeof that.getUniqueId === "function"){
                that.getUniqueId(id);
            }
        });

        this.socket.on('serverResponse',function(event){
            console.log(event.res);
            if(event.res == 'started'){
                console.log('Server started successfully');
                localStorage.serverStatus = 'on';
                if(typeof that.onServerResponse === 'function'){
                    that.onServerResponse(true);
                }
            }
            else if(event.res == 'stopped'){
                console.log('Server stopped successfully');
                localStorage.serverStatus = 'off';
                var stop = JSON.stringify({
                    webrtcConn:{
                        type: 'stop',
                        id: that.uniqueId
                    }
                });
                for (var clientID in that.connections) {
                    if (that.connections.hasOwnProperty(clientID)) {
                        that.sendData(stop,clientID);
                        that.removeConnection(clientID);
                    }
                }
                if(typeof that.onServerResponse === 'function'){
                    that.onServerResponse(false);
                }
            }
            else if(event.res == 'exists'){
                console.log('Server name already exists');
                if(typeof that.onServerResponse === 'function'){
                    that.onServerResponse('exists');
                }
            }
            else if(event.res == 'incorrect'){
                console.log('Invalid credentials');
                if(typeof that.onServerResponse === 'function'){
                    that.onServerResponse(false);
                }
            }
            else if(event.res == 'new'){
                var settings = frappe.newDoc({
                    doctype: 'ServerSettings',
                    serverName: event.name,
                    serverKey: event.key
                });
                settings.insert().then(doc => {
                    console.log('Registered and started successfully');
                    localStorage.serverStatus = 'on';
                    if(typeof that.onServerResponse === 'function'){
                        that.onServerResponse(true);
                    }
                });
            }
        });
        
        this.socket.on('created',function(creatorID){
            console.log(creatorID);
            if(creatorID == 'fail'){
                console.log('Server does not exist');
                that.onConnectionResponse('fail');
            }
            else{
                that.setupConnection(creatorID);
                that.socket.emit('join',creatorID);
            }
        });

        this.socket.on('joined', function(masterID) {
            console.log('to creator');
            that.masterNode = masterID;
            that.setupConnection(masterID);
            that.socket.emit('ready',masterID);
        });

        this.socket.on('createOffer',function(creatorID){
            that.masterNode = creatorID;
            that.createOffer(creatorID).then(offer => {
                that.socket.emit('offer',{creatorID:creatorID, offer:offer});
            });
        });

        this.socket.on('sendOffer',function(event) {
            that.createAnswer(event.offer,event.id).then(answer => {
                that.socket.emit('answer',{masterID:event.id, answer: answer});
            });
        });

        this.socket.on('sendAnswer', function(event){
            that.setHostRemote(event.answer,event.id);
        });

        this.socket.on('candidate', function (event) {
            var candidate = new RTCIceCandidate({
                sdpMLineIndex: event.event.label,
                candidate: event.event.candidate
            });
            that.connections[event.id].addIceCandidate(candidate);
        });
    }

    setupConnection(id){
        this.connections[id] = new RTCPeerConnection(this.iceServers);
        this.createDataChannel(id);
        this.onIceCandidate(id);
    }

    onIceCandidate(socketID){
        var that = this;
        this.connections[socketID].onicecandidate = event => {
            if (event.candidate) {
                that.socket.emit('candidate', {
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate,
                    socketID: socketID
                });
            }
        }
    }

    async createOffer(id) {
        var that = this;
        return await this.connections[id].createOffer()
        .then(desc => {
            that.connections[id].setLocalDescription(desc);
            return desc;
        })
        .catch(e => console.log(e));
    }

    async createAnswer(offer,id) {
        var that = this;
        this.connections[id].setRemoteDescription(new RTCSessionDescription(offer));
    
        return await this.connections[id].createAnswer()
            .then(desc => {
                that.connections[id].setLocalDescription(desc);
                return desc;
            })
            .catch(e => console.log(e));
    }

    setHostRemote(answer,id){
        this.connections[id].setRemoteDescription(new RTCSessionDescription(answer));
    }

    createDataChannel(id){
        var that = this;
        this.dataChannels[id] = this.connections[id].createDataChannel("myDataChannel");
    
        this.dataChannels[id].onerror = function (error) {
            console.log("Data Channel Error:", error);
            if(typeof that.onConnectionResponse === 'function'){
                that.onConnectionResponse(false);
            }
        };
        
        this.dataChannels[id].onopen = function () {
            console.log("The Data Channel is Open");
            if(typeof that.onConnectionResponse === 'function'){
                that.onConnectionResponse(true);
            }
        };
        
        this.dataChannels[id].onclose = function () {
            console.log("The Data Channel is Closed");
            if(typeof that.onConnectionResponse === 'function'){
                that.onConnectionResponse(false);
            }
        };

        this.setupReceiver(id);
    }

    setupReceiver(id){
        var that = this;
        this.connections[id].ondatachannel = event => {
            const receiveChannel = event.channel;
            receiveChannel.onmessage = async message => {
                console.log(message);
                try{
                    var data = JSON.parse(message.data);
                }
                catch(e){
                    var data = message.data;
                }                
                console.log(JSON.stringify(data));
                if(data.webrtcAuth){
                    var payload = data.webrtcAuth;
                    console.log(payload);
                    if(payload.type === 'req'){
                        this.verifyClient(payload.email, payload.password, payload.clientID);
                    }
                    else if(payload.type === 'res'){
                        if(payload.allow){
                            if(typeof this.onAccessResponse === 'function'){
                                this.onAccessResponse(true);
                            }
                        }
                        else{
                            if(typeof this.onAccessResponse === 'function'){
                                this.onAccessResponse(false);
                            }
                        }
                    }
                }
                else if(data.webrtcConn){
                    var payload = data.webrtcConn;
                    console.log(payload);
                    if(payload.type == 'stop'){
                        that.removeConnection(payload.id);
                    }
                }
                else if(data.type === 'request') {
                    const method = data.method;
                    const args = Array.isArray(data.payload) ? data.payload : [data.payload];
                    const response = await frappe.db[method](...data.payload);
                    this.sendResponse(data.senderID, data._uid, response);
                }
                else if(data.type === 'response'){
                    this.events.trigger(`responseFor:${data._uid}`, data.payload);
                }
                else if(data.type === 'event'){
                    console.log('received event');
                    frappe.db.trigger(`change:${data.doctype}`, {name:data.name}, 500);
                    frappe.db.trigger(`change`, {doctype:data.name, name:data.name}, 500);
                }
                else{
                    if(typeof this.onDataReceive === 'function'){
                        this.onDataReceive(message.data);
                    }
                }
            }
        }
    }

    requestAccess(email,password){
        var payload = JSON.stringify({
            webrtcAuth:{
                type: 'req',
                email: email,
                password: password,
                clientID: this.uniqueId
            }
        });
        this.sendData(payload);
    }

    verifyClient(email, password, clientID){
        var positive = JSON.stringify({
            webrtcAuth:{
                type: 'res',
                allow: true 
            }
        });

        var negative = JSON.stringify({
            webrtcAuth:{
                type: 'res',
                allow: false 
            }
        });

        var stop = JSON.stringify({
            webrtcConn:{
                type: 'stop',
            }
        });

        frappe.getDoc('User',email).then((userInfo) => {
            if (userInfo.password == password) {
                this.sendData(positive, clientID);
            }

            else{
                this.sendData(negative, clientID);
                this.sendData(stop,clientID);
                this.removeConnection(clientID);
            }
        })
        .catch(error => {
            this.sendData(negative, clientID);
            this.sendData(stop,clientID);
            this.removeConnection(clientID);
        });
    }

    sendData(data,receiver = this.masterNode){
        this.dataChannels[receiver].send(data);
    }

    sendRequest(obj) {
        const uid = utils.getRandomString();
        obj._uid = uid;
        obj.senderID = this.uniqueId;
        obj.type = 'request';
        const data = JSON.stringify(obj);
        return new Promise((resolve, reject) => {
            this.sendData(data);
            this.events.on(`responseFor:${uid}`, (response) => {
                resolve(response);
            });
        });
    }

    sendResponse(senderID, uid, response) {
        const obj = {
            payload: response,
            _uid: uid,
            type: 'response'
        };
        const data = JSON.stringify(obj);
        this.sendData(data, senderID);
    }

    sendEvent(doctype, name){
        const obj = {
            doctype: doctype,
            name: name,
            type: 'event'
        };
        const data = JSON.stringify(obj);
        for (var clientID in this.connections) {
            if (this.connections.hasOwnProperty(clientID)) {
                this.sendData(data, clientID);
            }
        }
    }

    removeConnection(id){
        if(this.dataChannels[id] && this.connections[id]){
            this.dataChannels[id].close();
            this.connections[id].close();
            delete this.dataChannels[id];
            delete this.connections[id];
        }
    }
}
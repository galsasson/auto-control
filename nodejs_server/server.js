#!/usr/bin/env node

var currentParameters = [
    {
        "name": "Enable animation",
        "type": "bool",
        "boolVal": false
    },
    {
        "name": "Global speed",
        "type": "double",
        "min": 0,
        "max": 1,
        "step": 0.01,
        "doubleVal": 0
    },
    {
        "name": "Sprite size",
        "type": "double",
        "min": 0,
        "max": 100,
        "step": 1,
        "doubleVal": 50
    },
    {
        "name": "Sprite tint",
        "type": "color",
        "colorVal": "#ffff00ff"
    },
    {
        "name": "Message",
        "type": "string",
        "stringVal": "This is a sample string, edit it to update"
    },
    {
        "name": "Click Me",
        "type": "btn"
    }
]


// read all presets
var presets = [];
var presetFolder = './presets/';
var fs = require('fs');
fillPresetList();

// handle connections
var connections = [];
var WebSocketServer = require('websocket').server;
var http = require('http');

var server = http.createServer(function(request, response) {
    console.log((new Date()) + ' Received request for ' + request.url);
    response.writeHead(404);
    response.end();
});
server.listen(8080, function() {
    console.log((new Date()) + ' Server is listening on port 8080');
});

wsServer = new WebSocketServer({
    httpServer: server,
    // You should not use autoAcceptConnections for production
    // applications, as it defeats all standard cross-origin protection
    // facilities built into the protocol and the browser.  You should
    // *always* verify the connection's origin and decide whether or not
    // to accept it.
    autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

wsServer.on('request', function(request) {
    if (!originIsAllowed(request.origin)) {
      // Make sure we only accept requests from an allowed origin
      request.reject();
      console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
      return;
    }

    var connection = request.accept('remote-control', request.origin);
    connections.push(connection);
    console.log("client connected (currently " + connections.length + ")");
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
            parseMessage(connection, message.utf8Data);
        }
        else if (message.type === 'binary') {
            console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
            connection.sendBytes(message.binaryData);
        }
    });
    connection.on('close', function(reasonCode, description) {
        var index = connections.indexOf(connection);
        if (index>-1) {
            connections.splice(index, 1);
        }
        console.log("client disconnected (currently "+connections.length+")");
    });
});

function parseMessage(connection, message) {
    var json = JSON.parse(message);
    if (json.type == "get_param_list") {
        sendParamList(connection, currentParameters);
    }
    else if (json.type == "update_param") {
        updateParam(connection, JSON.parse(json.data));
    }
    else if (json.type == "get_preset_list") {
        sendPresetList(connection);
    }
    else if (json.type == "save_preset") {
        fs.writeFile(presetFolder + json.data, JSON.stringify(currentParameters), function(err) {
            if (err) {
                return console.log(err);
            }
            console.log("New preset saved in: "+presetFolder + json.data);
            fillPresetList();
            for (var c=0; c<connections.length; c++) {
                sendPresetList(connections[c]);
            }
        });
    }
    else if (json.type == "load_preset") {
        fs.readFile(presetFolder + json.data, 'utf8', function(err, data) {
            if (err) {
                return console.log(err);
            }
            currentParameters = JSON.parse(data);
            for (var c=0; c<connections.length; c++) {
                sendParamList(connections[c], currentParameters);
            }
        });
    }
    else if (json.type == 'delete_preset') {
        fs.unlink(presetFolder + json.data, function(err) {
            if (err) {
                return console.log(err);
            }
            fillPresetList();
            for (var c=0; c<connections.length; c++) {
                sendPresetList(connections[c]);
            }
        });
    }
    else if (json.type == 'download_preset') {
        fs.readFile(presetFolder + json.data, 'utf8', function(err, data) {
            if (err) {
                return console.log(err);
            }
            var presetParameters = JSON.parse(data);
            sendPresetDownload(connection, presetParameters);
        });
    }
}

function sendParamList(connection, params)
{
    var json = {
        type: 'set_param_list',
        data: JSON.stringify({'list':params})
    };
    connection.sendUTF(JSON.stringify(json));
}

function sendPresetDownload(connection, params)
{
    var json = {
        type: 'take_preset_download',
        data: JSON.stringify({'list':params})
    };
    connection.sendUTF(JSON.stringify(json));
}

function fillPresetList()
{
    presets=[];
    var files = fs.readdirSync(presetFolder);
    files.forEach(file => {
        // add each file as a preset (ignore hidden)
        if (file[0] != '.') {
            presets.push(file);
        }
    });
}

function sendPresetList(connection)
{
    var json = {
        type: 'set_preset_list',
        data: JSON.stringify({'list':presets})
    };
    connection.sendUTF(JSON.stringify(json));
}

function updateParam(connection, param) {
    // console.log("updating param "+param.name+" with value "+param.value);
    var index;
    var p = undefined;
    for (index=0; index<currentParameters.length; index++) {
        p = currentParameters[index];
        if (p.name == param.name) {
            if (p.type == "bool") {
                p.boolVal = param.boolVal;
            }
            else if (p.type == "double") {
                p.doubleVal = param.doubleVal;
            }
            else if (p.type == "color") {
                p.colorVal = param.colorVal;
            }
            else if (p.type == "string") {
                p.stringVal = param.stringVal;
            }
            else if (p.type == "btn") {
                console.log("button click: "+p.name);
            }
            break;
        }
    }

    if (p == undefined) {
        return;
    }

    // update other connections
    var json = {
        type: 'update_param',
        data: JSON.stringify(p)
    };
    var msg = JSON.stringify(json);

    for (var c=0; c<connections.length; c++) {
        if (connections[c] == connection) {
            continue;
        }

        connections[c].sendUTF(msg);
    }
}

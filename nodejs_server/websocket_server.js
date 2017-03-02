#!/usr/bin/env node

var parameters = [
    {
        "name": "toggle_1",
        "type": "bool",
        "value": false
    },
    {
        "name": "value_1",
        "type": "float",
        "min": 0,
        "max": 1,
        "step": 0.01,
        "value": 0
    },
    {
        "name": "value_2",
        "type": "float",
        "min": 0,
        "max": 100,
        "step": 1,
        "value": 50
    },
    {
        "name": "color_1",
        "type": "color",
        "value": "#ffff00ff"
    },
    {
        "name": "string_1",
        "type": "string",
        "value": "This is a sample string, edit it to update"
    }
]

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

    var connection = request.accept('auto-control', request.origin);
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
    if (json.event == "get_param_list") {
        sendParamList(connection);
    }
    else if (json.event == "update_param") {
        updateParam(connection, json.data);
    }
}

function sendParamList(connection)
{
    var json = { 
        event: 'set_param_list',
        data: parameters
    };
    connection.sendUTF(JSON.stringify(json));
}

function updateParam(connection, param) {
    // console.log("updating param "+param.name+" with value "+param.value);
    var index;
    var p = undefined;
    for (index=0; index<parameters.length; index++) {
        p = parameters[index];
        if (p.name == param.name) {
            p.value = param.value;
            break;
        }
    }

    if (p == undefined) {
        return;
    }

    // update other connections
    var json = {
        event: 'update_param',
        data: p
    };
    var msg = JSON.stringify(json);

    for (var c=0; c<connections.length; c++) {
        if (connections[c] == connection) {
            continue;
        }

        connections[c].sendUTF(msg);
    }
}
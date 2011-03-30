#!/usr/bin/env node

/*
 *  Copyright (C) 2011  Emmanuel Gil Peyrot <linkmauve@linkmauve.fr>
 *
 *  This file is the source code of an XMPP avatar retriever.
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as
 *  published by the Free Software Foundation, version 3 of the License.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

var config = require('./configuration');

try {
	var xmpp = require('node-xmpp');
	var conn = new xmpp.Component({
		jid: config.jid,
		password: config.password,
		host: 'localhost',
		port: 5347
	});

	conn.on('stanza', function (stanza) {
		if (stanza.is('iq'))
			onIq(stanza);
		else
			onError(stanza);
	});

	conn._uniqueId = 42;
	conn.getUniqueId = function(suffix) {
		return ++this._uniqueId + (suffix?(":"+suffix):"");
	};

	var Element = require('ltx').Element;
} catch (e) {
	var xmpp = require('xmpp');
	var conn = new xmpp.Connection();

	conn.log = function (_, m) { console.log(m); };

	conn.connect(config.jid, config.password, function (status, condition) {
		if(status == xmpp.Status.CONNECTED) {
			conn.addHandler(onIq, null, 'iq', null, null,  null);
			conn.addHandler(onError, null, 'message', null, null,  null);
			conn.addHandler(onError, null, 'presence', null, null,  null);
		} else
			conn.log(xmpp.LogLevel.DEBUG, "New connection status: " + status + (condition?(" ("+condition+")"):""));
	});

	xmpp.StanzaBuilder.prototype.cnode = function (stanza)
	{
		var parent = this.last_node[this.last_node.length-1];
		parent.tags.push(stanza);
		parent.children.push(stanza);
		this.last_node.push(stanza);
		return this;
	};

	var Element = xmpp.StanzaBuilder;
}

var fs = require('fs');
var http = require('http');

process.addListener('uncaughtException', function (err) {
	console.log('\x1b[41;1mUncaught exception (' + err + '), this should never happen:\x1b[0m\n' + err.stack);
});

var extensions = {
	png: 'image/png',
	svg: 'image/svg+xml',
	jpg: 'image/jpeg',
	gif: 'image/gif'
}

var jids = {};

var sent = {};

var makeError = function(response) {
	response.attr.type = 'error';

	var error = new Element('error', {type: 'cancel'});
	error.c('feature-not-implemented', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'}).up();
	response.cnode(error);

	return response;
}

function onIq(stanza) {
	var type = stanza.getAttribute('type');
	var from = stanza.getAttribute('to');
	var to = stanza.getAttribute('from');
	var id = stanza.getAttribute('id');

	var response;
	if (id)
		response = new Element('iq', {to: to, from: from, type: 'result', id: id});
	else
		response = new Element('iq', {to: to, from: from, type: 'result'});

	if (!sent[id]) {
		conn.send(makeError(response));
		return;
	}

	var res = sent[id];
	delete sent[id];

	if (type == 'error') {
		try {
			var err = stanza.getChild('error').getChild().name;
		} catch (e) {
			var err = 'none';
		}
		res.writeHead(500, {'Content-Type': 'text/plain'});
		res.end('Error during query of this user’s vCard: “'+err+'”.');
		return;
	}

	var vCard = stanza.getChild('vCard', 'vcard-temp');
	if (!vCard) {
		res.writeHead(500, {'Content-Type': 'text/plain'});
		res.end('Error: this user doesn’t have a vCard.');
		return;
	}

	try {
		var photo = vCard.getChild('PHOTO', 'vcard-temp');
		var base64 = photo.getChild('BINVAL', 'vcard-temp').getText();

		try {
			var type = photo.getChild('TYPE', 'vcard-temp').getText();
		} catch (e) {
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end('Error: this user’s vCard doesn’t specify the MIME type of its avatar.');
		}

		var ext;
		for (var i in extensions)
			if (type == extensions[i])
				ext = i;

		if (ext === undefined) {
			console.log('Type MIME inconnu : '+type);
			res.writeHead(500, {'Content-Type': 'text/plain'});
			res.end('Error: this user’s avatar is in an unknown format.');
			return;
		}

		var binval = new Buffer(base64.replace(/\n/g, ''), 'base64');

		fs.writeFile(config.directory+'/'+to+'.'+ext, binval, function() {
			jids[to] = ext;
			showImage(to, res);
		});
	} catch (e) {
		res.writeHead(500, {'Content-Type': 'text/plain'});
		res.end('Error: this user doesn’t have an avatar in his/her vCard.');
	}
}

function onError(stanza) {
	if (stanza.getAttribute('type') == 'error')
		return;

	var from = stanza.getAttribute('to');
	var to = stanza.getAttribute('from');
	var id = stanza.getAttribute('id');

	var response;
	if (id)
		response = new Element(stanza.name, {to: to, from: from, id: id});
	else
		response = new Element(stanza.name, {to: to, from: from});

	conn.send(makeError(response));
}

var getVCard = function(jid) {
	var id = conn.getUniqueId();

	var toSend = new Element('iq', {to: jid, from: config.jid, type: 'get', id: id})
		.c('vCard', {xmlns: 'vcard-temp'});

	conn.send(toSend);

	return id;
}

var showImage = function(jid, res) {
	var extension = jids[jid];
	var file = config.directory+'/'+jid+'.'+extension;
	res.writeHead(200, {'Content-Type': extensions[extension]});
	fs.readFile(file, function(err, data) {
		res.end(data);
	});
	fs.stat(file, function(err, stats) {
		if (err) {
			console.log('Error when stat on “'+file+'”.');
			return;
		}

		var last = new Date(stats.mtime);
		var now = new Date();

		if (now - last > 24*60*60*1000) {
			fs.unlink(file, function() {
				delete jids[jid];
				var id = getVCard(jid);
				sent[id] = res;
			});
		}
	});
	return;
}

fs.readdir('data', function(err, files) {
	if (err)
		process.exit('1');

	for (i in files) {
		var tab = /(.*)\.([a-z]{3})/.exec(files[i]);
		jids[tab[1]] = tab[2];
	}
});

http.createServer(function (req, res) {
	console.log('Connection from '+req.client.remoteAddress+' ('+req.headers['user-agent']+') to get “'+req.url+'”.');

	var easterEggs = {
		source: {
			re: /^\/avatar\/source\/code$/,
			file: process.argv[1],
			mime: 'application/ecmascript',
			error: 'source code unavailable! oO'
		},
		README: {},
		COPYING: {},
	};

	req.setEncoding('utf-8');

	for (var i in easterEggs) {
		var ee = easterEggs[i];
		var file = ee.file || i;
		var re = ee.re || new RegExp('^/avatar/'+file+'$');
		if (re.test(req.url)) {
			fs.readFile(file, function(err, content) {
				if (err) {
					res.writeHead(500, {'Content-Type': 'text/plain'});
					res.end('Error: ' + (ee.error || file + ' unavailable.'));
					return;
				}
				res.writeHead(200, {'Content-Type': ee.mime || 'text/plain'});
				res.end(content);
			});
			return;
		}
	}

	var jid = unescape(req.url.replace(/^\/avatar\//, ''));

	if (jid === '') {
		res.writeHead(200, {'Content-Type': 'application/xhtml+xml'});
		res.write('<?xml version="1.0" encoding="utf-8"?>\n');
		res.write('<!DOCTYPE html>\n');
		res.write('<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">\n');
		res.write('\t<head>\n');
		res.write('\t\t<title>JavaScript XMPP Avatar Retriever</title>\n');
		res.write('\t</head>\n');
		res.write('\t<body>\n');
		res.write('\t\t<header><h1>JavaScript XMPP Avatar Retriever</h1></header>\n');
		res.write('\t\t<p>Put any JID and get its avatar. :)</p>\n');
		res.write('\t\t<form action="redirect" method="post">\n');
		res.write('\t\t\t<p>\n');
		res.write('\t\t\t\t<input name="jid" type="text" placeholder="you@yourserver.tld"/>\n');
		res.write('\t\t\t\t<input type="submit"/>\n');
		res.write('\t\t\t</p>\n');
		res.write('\t\t</form>\n');
		res.write('\t\t<footer><p>(<a href="README">README</a>, <a href="source/code">source code</a>)</p></footer>\n');
		res.write('\t</body>\n');
		res.end('</html>\n');
		return;
	}

	if (jid === 'redirect') {
		if (req.method !== 'POST') {
			res.writeHead(404, {'Content-Type': 'text/plain'});
			res.end('Error: redirect unavailable.');
			return;
		}

		req.on('data', function(content) {
			console.log(content);
			var jid = unescape(content.toString()).replace(/^jid=/, '');
			res.writeHead(301, {'Location': jid});
			res.end();
		});
		return;
	}

	if (jid in jids) {
		showImage(jid, res);
		return;
	}

	var id = getVCard(jid);

	sent[id] = res;
}).listen(8032);

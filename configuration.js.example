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

var config = exports;

// The JID and password of the component, that have to be configured in
// the host.
config.jid = 'avatar.example.org';
config.password = 'hellohello';

// The hostname or IP address and the port of the XMPP server hosting
// the component.
config.host = 'localhost';
config.port = 5347;

// Root of the webservice, useful if you want to proxy it.
config.webRoot = '^/avatar/';

// These are the host and the port on which the web service will
// listen.  If you want IPv4 connection only, instead of both IPv4 and
// IPv6, replace '::' by '0.0.0.0'.  If you want a port < 1024, you
// have to start it as root, use a proxy or redirect it using a
// firewall like iptables.
config.webHost = '::';
config.webPort = 8032;

// Directory for the cache of the images.
config.directory = 'data';

// When true, assume that the TYPE of the avatar is image/png if not
// specified.  Warning: it doesn’t follow the spec and is only a
// workaround for buggy clients.
config.guessType = false;

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

config.jid = 'avatar.example.org';
config.host = 'localhost';
config.port = 5347;
config.password = 'hellohello';

config.webRoot = '^/avatar/';
config.directory = 'data'; // Directory of the cache.
config.guessType = false; // When true, assume that the TYPE of the avatar is image/png if not specified.

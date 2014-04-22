/**
 * Module dependencies
 */

var stack = require('simple-stack-common');
var Blarney = require('blarney');

var app = module.exports = stack({
  base: {
    host: 'x-orig-host',
    path: 'x-orig-path',
    port: 'x-orig-port',
    proto: 'x-orig-proto'
  }
});

app.useBefore('router', function setup(req, res, next) {
  req.b = new Blarney(req.url, Math.floor(Date.now() / (3600 * 1000)));
  var url = req.base + (req.url === '/' ? '' : req.url);
  var _json = res.json;
  res.json = function(data) {
    var root = res.locals.root;
    data.root = {href: req.base};
    data.href = url;
    _json.call(res, data);
  };
  next();
});

app.get('/', function(req, res, next) {
  res.json({
    account: {
      href: req.base + '/users/' + req.b.uuid()
    },
    feeds: {
      href: req.base + '/feeds'
    },
    posts: {
      href: req.base + '/posts'
    }
  });
});

app.get('/feeds', function(req, res) {
  res.json(collection(req, 'feeds'));
});

app.get('/feeds/:feed', function(req, res) {
  res.json(collection(req, 'posts', {
    title: req.b.words()
  }));
});

app.get('/posts', function(req, res) {
  res.json({
    create: {
      action: req.base + '/posts',
      method: 'POST',
      input: {
        content: {
          type: 'text',
          max: 140,
          required: true
        }
        // TODO location
      }
    }
  });
});

app.post('/posts', function(req, res) {
  res.redirect('/posts/' + req.b.uuid());
});

app.get('/posts/:post', function(req, res) {
  var image = req.b.pick([
    'http://i.imgur.com/CcydwKs.gif',
    'http://i.imgur.com/uHDzq2l.gif',
    'http://i.imgur.com/RLuvml0.gif',
    'http://i.imgur.com/dzeovCm.gif',
    'http://i.imgur.com/02NT72E.gif',
    'http://i.imgur.com/CPLXDuM.gif',
    'http://i.imgur.com/eucxwpW.gif',
    'http://i.imgur.com/on16bFo.gif',
    'http://i.imgur.com/MrjmmSZ.gif'
  ]);
  var post = {
    id: req.params.post,
    owner: req.b.uuid(),
    content: [{href: req.base + '/users/' + req.b.uuid(), type: 'mention'}, ' lol so fun with ', {href: req.base + '/users/' + req.b.uuid(), type: 'mention'}, {src: image, type: 'image'}],
    original: '@freddy lol so fun with @bigsuz http://i.imgur.com/CcydwKs.gif',
    date: new Date(req.b.timestamp()),
    parent: req.b.uuid()
  };
  res.json({
    content: post.content,
    text: post.original,
    date: post.date,
    author: {
      href: req.base + '/users/' + post.owner
    },
    favorites: {
      href: req.base + '/posts/' + post.id + '/favorites'
    },
    reposts: {
      href: req.base + '/posts/' + post.id + '/reposts'
    },
    '@update': 'only show when user owns post',
    update: {
      action: req.base + '/posts/' + post.id,
      method: 'PUT',
      input: {
        content: {
          type: 'text',
          max: 140,
          required: true,
          value: post.original
        }
      }
    },
    '@delete': 'only show when user owns post',
    delete: {
      action: req.base + '/posts/' + post.id,
      method: 'DELETE'
    },
    replies: {
      href: req.base + '/posts/' + post.id + '/replies'
    },
    '@parent': 'only show when post has a parent',
    parent: {
      href: req.base + '/posts' + post.parent
    }
  });
});

app.get('/posts/:post/replies', function(req, res) {
  var id = req.params.post;
  res.json(collection(req, 'posts', {
    reply: {
      action: req.base + '/posts/' + id + '/replies',
      method: 'POST',
      input: {
        content: {
          type: 'text',
          max: 140,
          required: true
        }
      }
    }
  }));
});

app.get('/posts/:post/favorites', function(req, res) {
  var id = req.params.post;
  res.json(collection(req, {
    '@favorite': 'show when the user has not favorited the post',
    favorite: {
      action: req.base + '/posts/' + id + '/favorites',
      method: 'POST'
    },
    '@unfavorite': 'show when the user has favorited the post',
    unfavorite: {
      action: req.base + '/posts/' + id + '/favorites',
      method: 'POST'
    },
    post: {
      href: req.base + '/posts/' + id
    }
  }));
});

app.get('/posts/:post/reposts', function(req, res) {
  var id = req.params.post;
  res.json(collection(req, {
    '@favorite': 'show when the user has not reposted the post',
    repost: {
      action: req.base + '/posts/' + id + '/reposts',
      method: 'POST'
    },
    post: {
      href: req.base + '/posts/' + id
    }
  }));
});

app.get('/users/:user', function(req, res) {
  var gender = req.b.gender();
  var name = req.b.name(gender);
  var image = req.b.portrait(gender);
  var user = {
    id: req.params.user,
    name: name,
    email: req.b.email(),
    handle: name.toLowerCase().replace(' ', '')
  };
  res.json({
    name: user.name,
    handle: user.handle,
    image: {
      src: image.largeSquare,
      thumbnail: {
        src: image.smallSquare
      }
    },
    followers: {
      href: req.base + '/users/' + user.id + '/followers'
    },
    following: {
      href: req.base + '/users/' + user.id + '/following'
    },
    '@block': 'show when user is not blocked and is not the logged in user',
    block: {
      action: req.base + '/users/' + user.id,
      method: 'POST',
      input: {
        _action: {
          type: 'hidden',
          value: 'block'
        }
      }
    },
    '@unblock': 'show when user is blocked',
    unblock: {
      action: req.base + '/users/' + user.id,
      method: 'POST',
      input: {
        _action: {
          type: 'hidden',
          value: 'unblock'
        }
      }
    },
    feed: {
      href: req.base + '/feeds/user-' + user.id
    }
  });
});

app.get('/users/:user/followers', function(req, res) {
  var id = req.params.user;
  res.json(collection(req, {
    '@follow': 'show when logged user is not following the user',
    follow: {
      action: req.base + '/users/' + id + '/followers',
      method: 'POST',
      input: {
        _action: {
          type: 'hidden',
          value: 'follow'
        }
      }
    },
    '@unfollow': 'show when logged user is following the user',
    unfollow: {
      action: req.base + '/users/' + id + '/followers',
      method: 'POST',
      input: {
        _action: {
          type: 'hidden',
          value: 'follow'
        }
      }
    }
  }));
});

app.get('/users/:user/following', function(req, res) {
  var id = req.params.user;
  res.json(collection(req));
});

function collection(req, prefix, obj) {
  if (typeof prefix === 'object') {
    obj = prefix;
    prefix = null;
  }
  prefix = prefix || 'users';
  obj = obj || {};
  var collection = obj.collection = [];
  var i = obj.count = req.b.integerInRange(0, 11);
  for(; i > 0; i--) {
    collection.push({
      href: req.base + '/' + prefix + '/' + req.b.uuid()
    });
  };
  var page = req.query.page;
  var url = req.base + req.url.split('?')[0];
  if (page) page = parseInt(page, 10);
  else page = 0;
  if (page && page !== 0 && page !== 1) obj.prev = {href: url + '?page=' + (page - 1)};
  if (page === 1) obj.prev = {href: url};
  if (obj.count === 10) obj.next = {href: url + '?page=' + (page + 1)};
  return obj;
}

function auth() {
  return function(req, res, next) {
    if (!req.user) return next('route');
    next();
  };
}

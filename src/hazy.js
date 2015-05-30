'use strict';

var _        = require('lodash'),
    jsonPath = require('jsonpath'),
    fs       = require('fs'),
    Chance   = require('chance')
    // TODO - assert

var hazy = {}

hazy.config = {
  seed: null,
  lazy: true,
  matcher: {
    use: true
  }
}

hazy.meta = {
  types: {
    basic  : ['bool', 'character', 'integer', 'natural', 'string'],
    text   : ['paragraph', 'sentence', 'syllable', 'word'],
    person : ['age', 'birthday', 'cpf', 'first', 'gender', 'last', 'name', 'prefix', 'ssn', 'suffix'],
    mobile : ['android_id', 'apple_token', 'bb_pin', 'wp7_anid', 'wp8_anid2'],
    web    : ['color', 'domain', 'email', 'fbid', 'google_analytics', 'hashtag', 'ip', 'ipv6', 'klout', 'tld', 'twitter', 'url'],
    geo    : ['address', 'altitude', 'areacode', 'city', 'coordinates', 'country', 'depth', 'geohash', 'latitude', 'longitude', 'phone', 'postal', 'province', 'state', 'street', 'zip'],
    time   : ['ampm', 'date', 'hammertime', 'hour', 'millisecond', 'minute', 'month', 'second', 'timestamp', 'year'],
    misc   : ['guid', 'hash', 'hidden', 'n', 'normal', 'radio', 'rpg', 'tv', 'unique', 'weighted']
  }
}

hazy.lang = {
  expression: {
    first : /\|(:|~|@)(.*?)?\|/,
    all   : /\|(:|~|@)(.*?)?\|/g
  },

  tokens: {
    "|": function(prev, next) { // expression start/end
      var isPrevToken    = this.validate(prev),
          isNextTokenEnd = /\|/.test(next) 

      if (isPrevToken || isNextTokenEnd) {
        throw hazy.lang.exception('Cannot define an empty expression')
      }

      if (!next) {
        // TODO - return a special value saying that this is the end of the token expression sequence. currenlty not technically needed
      }
    },

    ":": function(prev, next) { // property accessor
      if (!prev) {
        throw 'Syntax error, : requires a left operand'
      }

      return prev[next]
    },

    "~": function(prev, next, rest) { // random data
      var randProp   = next.split(':')[0],
          randVal    = next.split(':')[1],
          canUseProp = hazy.random.hasOwnProperty(randProp)

      if (canUseProp) {
        var randObjByProp  = hazy.random[randProp],
            randObjSubType = randVal // get property of random operator following ":"

        if (!randObjByProp || !randObjByProp[randObjSubType]) {
          throw hazy.lang.exception('Invalid random data type "' + randObjSubType + '". Supported:', hazy.meta.types[randProp])
        }

        return randObjByProp[randObjSubType]()
      } else {
        throw hazy.lang.exception('Invalid random data category "' + randProp + '". Supported', hazy.meta.types)
      }
    },

    "@": function(prev, next) { // link to fixture (TODO - make syntax support accessing properties of linked fixture)
      return hazy.fixture.get(next)
    },

    // TODO - / escape character

    validate: function(token) {
      return this.hasOwnProperty(token)
    },

    process: function(token, prev, next, rest) {
      return _.bindKey(hazy.lang.tokens, token, prev, next, rest)()
    }
  },

  // extracts tokens from strs and evaluates them. interpolates strings, ignores and simply returns other data types
  process: function(str) {
    var matches = str.split(hazy.lang.expression.all),
        tokens  = []

    _.forEach(matches, function(match, i) {
      var isToken = hazy.lang.tokens.validate(match)

      if (isToken) {
        var prevMatch   = matches[i - 1],
            nextMatch   = matches[i + 1],
            restMatches = _.drop(matches, i + 1),
            tokenResult = this.tokens.process(match, prevMatch, nextMatch, restMatches)

        if (tokenResult) {
          // if processed token result is a string, substitute in original string as we iterate
          if (_.isString(tokenResult)) {
            str = str.replace(hazy.lang.expression.first, tokenResult)
          } else {
            tokens.push(tokenResult)
          }
        }
      }
    }, this)

    if (!_.isEmpty(tokens)) {
      return _.reduce(tokens) || str
    }

    return str
  },

  exception: function(msg) {
    return '[Hazy syntax error] ' + msg
  }
}

hazy.random = _.mapValues(hazy.meta.types, function(value, key) {
  var hazyRandObj = {}
  
  _.forEach(value, function(v) {
     hazyRandObj[v] = function() { return new Chance()[v]() }
  })
  
  return hazyRandObj
})

hazy.fixture = {
  pool: {},

  // fetches a fixture from the pool and processes it if necessary
  get: function(key) { // TODO - may want to memoize this
    var fixture = this.pool[key]

    return hazy.config.lazy && _.isFunction(fixture) ? fixture() : fixture
  },

  // registers a processable fixture into the fixture pool
  register: function(name, fixture, lazy) {
    this.pool[name] = lazy || hazy.config.lazy ? function() { return hazy.fixture.process(fixture) } : this.process(fixture)
  },

   // dynamically process fixture values by type (object, string, array, or function)
  process: function(fixture) {
    var processedFixture = fixture

    if (_.isPlainObject(fixture)) {
      _.mapKeys(fixture, function(value, key) {
        var processedKey = hazy.lang.process(key),
            nextFixture     = value
            
        processedFixture[processedKey] = hazy.fixture.process(nextFixture)
      })
    }

    if (_.isString(fixture)) {
      return hazy.lang.process(fixture)
    }
    
    if (_.isArray(fixture)) {
      return _.map(fixture, hazy.fixture.process)
    }

    // apply pattern matching to processed fixture if applicable
    return hazy.matcher.processDeep(processedFixture)
  },

  // load and register a fixture from file
  load: function(file) {
    if (_.isArray(file)) {
      _.forEach(file, function() {
         // TODO - load from FS, call register
      })
    } else {

    }
  },

  write: function(path) {
    // TODO - write to FS
  }
}

hazy.matcher = {
  pool: {},

  register: function(path, value) {
    this.pool[path] = value
  },

  config: function(config) {
    if (!_.isEmpty(hazy.fixture.pool))
      throw 'Matches can only be added before fixtures are in the fixture pool'

    var matcherPath    = config.path,
        matcherHandler = config.handler

    this.pool[matcherPath] = {path: matcherPath, handler: matcherHandler}
  },

  // provides a map of all matched patterns in a fixture (pattern as key)
  matches: function(fixture) {
    var matches = {}

    if (hazy.config.matcher.use) {
      _.mapKeys(hazy.matcher.pool, function(v, pattern) {
        if (_.isObject(fixture)) {
          var jpMatches = jsonPath.query(fixture, pattern)

          if (!_.isEmpty(jpMatches)) {
            matches[pattern] = jpMatches
          }
        }
      })
    } else {
      // WARN - matching disabled
    }

    return matches
  },

  // determines if any matches in the pool apply to the fixture
  hasMatch: function(fixture) {
    return !_.isEmpty(
      hazy.matcher.matches(fixture)
    )
  },

  // executes a single pattern matcher handler on a fixture
  process: function(pattern, fixture) {
    var matcher = hazy.matcher.pool[pattern]

    if (_.isObject(matcher) && _.isFunction(matcher.handler)) {
      var matches = jsonPath.query(fixture, pattern),
          handler = matcher.handler

      return handler(fixture, matches, pattern)
    } else {
      throw 'Match pattern does not apply to fixture or handler is not a function'
    }
  },

  // executes handlers for all pattern matches on a fixture
  processDeep: function(fixture) {
    var patternMatches = this.matches(fixture)
    var processedFixture  = fixture

    _.mapKeys(patternMatches, function(match, pattern) {
      processedFixture = hazy.matcher.process(pattern, fixture) || processedFixture
    })

    return processedFixture
  }
}

module.exports = hazy

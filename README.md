# Hazy

Lazy and light-weight JSON fixtures in Node

-----

Hazy aims to ease the hassle of generating, maintaining and working with JSON fixtures by making them more self-descriptive and programmatic.
Hazy lets developers describe test data in a generic fasion and allows for fixtures to be processed further at run-time for increased flexibility.

### Features

* Lazy data matching in JSON fixtures
* Lazy fixture embedding
* Lazy processing via run-time queries ([jsonpath](http://goessner.net/articles/JsonPath/))
* Syntax layer integrating `ChanceJS` that provides a simple and non-intrusive interface

### Design Goals

* Non-invasive (retain all involved standards)
* Unique and identifiable syntax
* Convention based, interpreter agnostic
* Pre-processed and optionally evaluated at run-time
* Cleanly integrate with __all__ testing frameworks

### Examples

Here we register a couple of Hazy fixtures into what's refered to as the fixture pool:

```javascript
var hazy = require('hazy')

hazy.fixture.register('someDude', {
  id   : '|~misc:guid|',
  name : '|~person:prefix| |~person:name|',
  bday : '|~person:birthday|',
  ssn  : '|~person:ssn| (not really)',
})

hazy.fixture.register('someDog', {
  id    : '|~misc:guid|',
  name  : 'Dawg',
  owner : '|@someDude|'
})

var hazyDude = hazy.fixture.get('someDude')
var hazyDog  = hazy.fixture.get('someDog')
```

The processed fixtures result as follows:

```javascript
// hazyDude
{
  id: 'e76de72e-6010-5140-a270-da7b6b6ad2d7',
  name: 'Mrs. Cornelia Warner Agnes Hammond',
  bday: Wed Apr 27 1994 04:05:27 GMT-0700 (Pacific Daylight Time),
  ssn: '264-66-4154 (not really)'
}

// hazyDog
{
  id: '427b2fa6-02f8-5be5-b3d1-cdf96f432e28',
  name: 'Dawg',
  owner: {
    id: 'e76de72e-6010-5140-a270-da7b6b6ad2d7',
    name: 'Mrs. Cornelia Warner Agnes Hammond',
    bday: Wed Apr 27 1994 04:05:27 GMT-0700 (Pacific Daylight Time),
    ssn: '264-66-4154 (not really)'
  }
}

```

## Randomness

Hazy sits on top of ChanceJS, a great library for generating all sorts of useful random data.
Hazy categorizes ChanceJS's generation methods for a more symantic syntax, but otherwise integration
is completely transparent.

The token for generating random data is `~`:

`|~...|`

### Random Data Tokens

* `|~basic:<type>|`

  where type can be `'bool', 'character', 'integer', 'natural', 'string'`

* `|~text:<type>|`

  where type can be `'paragraph', 'sentence', 'syllable', 'word'`

* `|~person:<type>|`

  where type can be `'age', 'birthday', 'cpf', 'first', 'gender', 'last', 'name', 'prefix', 'ssn', 'suffix'`

* `|~mobile:<type>|`

  where type can be `'android_id', 'apple_token', 'bb_pin', 'wp7_anid', 'wp8_anid2'`

* `|~web:<type>|`

  where type can be `'color', 'domain', 'email', 'fbid', 'google_analytics', 'hashtag', 'ip', 'ipv6', 'klout', 'tld', 'twitter', 'url'`

* `|~geo:<type>|`

  where type can be `'address', 'altitude', 'areacode', 'city', 'coordinates', 'country', 'depth', 'geohash', 'latitude', 'longitude', 'phone', 'postal', 'province', 'state', 'street', 'zip'`

* `|~time:<type>|`

  where type can be `'ampm', 'date', 'hammertime', 'hour', 'millisecond', 'minute', 'month', 'second', 'timestamp', 'year'`

* `|~misc:<type>|`

  where type can be `'guid', 'hash', 'hidden', 'n', 'normal', 'radio', 'rpg', 'tv', 'unique', 'weighted'`

## Embedding

Hazy supports lazy embedding of other JSON fixtures (or really any value) present in the fixture pool. The example above shows this already:

```javascript
hazy.fixture.register('someDog', {
  id    : '|~misc:guid|',
  name  : 'Dawg',
  owner : '|@someDude|'
})
```

will resolve to the following provided that `someDude` is in the fixture pool

```javascript
{
  id: '427b2fa6-02f8-5be5-b3d1-cdf96f432e28',
  name: 'Dawg',
  owner: {
    id: 'e76de72e-6010-5140-a270-da7b6b6ad2d7',
    name: 'Mrs. Cornelia Warner Agnes Hammond',
    bday: Wed Apr 27 1994 04:05:27 GMT-0700 (Pacific Daylight Time),
    ssn: '264-66-4154 (not really)'
  }
}
```

## Matching

Hazy utilizes `jsonpath` for defining functionality to pre-processed fixtures in a query-like fasion.
Details on `jsonpath` can be found at http://goessner.net/articles/JsonPath/. There are many ways in which
JSON objects can be queried using this flexible technique.

The general idea in Haze is to give developers both fine grained and generalized control over the
functionality relevant to their fixtures, and only when/where it's truly needed.

Take our `someDog` fixture, for example:

```javascript
{
  id: '427b2fa6-02f8-5be5-b3d1-cdf96f432e28',
  name: 'Dawg',
  owner: {
    id: 'e76de72e-6010-5140-a270-da7b6b6ad2d7',
    name: 'Mrs. Cornelia Warner Agnes Hammond',
    bday: Wed Apr 27 1994 04:05:27 GMT-0700 (Pacific Daylight Time),
    ssn: '264-66-4154 (not really)'
  }
}
```

We can obtain the `id` of the dog's owner with the following query:

`$.owner.id`

After the fixture has been queried, this will result with:

`e76de72e-6010-5140-a270-da7b6b6ad2d7`

---

With Hazy we can leverage this powerful query mechanism in any testing environment to provide test-specific
functionality to your fixtures.

If we now wanted to query our fixture pool for any fixture with an `owner` object containing an `id` property,
then we would use the following:

```javascript
hazy.matcher.config({
  path    : '$.owner.id',
  handler : function(fixture, matches, pattern) {
    // return the fixture after mutating it (if you so desire)
    return _.extend(fixture, {
      hasOwner : true,
      bark     : function() {
        console.log('woof woof, my owner is ', matches[0])
      }
    })  
  }
})

hazy.fixture.register('someDogWithOwner', {
  id    : '|~misc:guid|',
  name  : 'Happy Dog',
  owner : '|@someDude|'
})

hazy.fixture.register('someDogWithoutOwner', {
  id    : '|~misc:guid|',
  name  : 'Lonely Dog'
})

var happyDog  = hazy.fixture.get('someDogWithOwner'),
    lonelyDog = hazy.fixture.get('someDogWithoutOwner')
```

Since the `matcher` only applies to fixtures with an owner id, only `happyDog` will contain the `hasOwner` property and
a `bark` method:

```javascript
happyDog.bark()
```

> `woof woof, my owner is e76de72e-6010-5140-a270-da7b6b6ad2d7`

```javascript
lonelyDog.bark()
```

> `Error: undefined is not a method`

This feature can also be combined with `hazy.fork()` so that queries can be context-specific. Any query defined
at a higher context level can be easily and safely overwritten in a Hazy fork:

```javascript
hazy.matcher.config({
  path    : '$.owner.id',
  handler : function(fixture, matches, pattern) {
    // return the fixture after mutating it (if you so desire)
    return _.extend(fixture, {
      hasOwner : true,
      bark     : function() {
        console.log('woof woof, my owner is ', matches[0])
      }
    })  
  }
})

hazy.fixture.register('someDogWithOwner', {
  id    : '|~misc:guid|',
  name  : 'Happy Dog',
  owner : '|@someDude|'
})

var happyDog  = hazy.fixture.get('someDogWithOwner'),
    sleepyDog = null

function forkTest() {
  var newHazy = hazy.fork()

  newHazy.matcher.config({
    path    : '$.owner.id',
    handler : function(fixture) {
      fixture.bark = function() {
        console.log('zzzz, too tired')
      }
      
      return fixture
    }
  })

  sleepyDog = newHazy.fixture.get('someDogWithOwner')
}

forkTest()
```

and now...

```javascript
happyDog.bark()
```
> still prints `woof woof, my owner is e76de72e-6010-5140-a270-da7b6b6ad2d7`, while

```javascript
sleepyDog.bark()
```
> now prints `zzzz, too tired`, overriding the matcher defined at a higher context level (AKA `happyDog`'s) safely

## TODO

- [ ] Repeaters
- [ ] Seeds and ranges for random data

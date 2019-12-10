# Local packages

Local packages are packages that existing inside your project/module, however they are accessed _as if_ they were installed in `node_modules`.

## Example

assume project structure like this:
```
/
    lib
        module1.js
        module2.js
        package.json
    index.js
    package.json
```

We create a `package.json` inside `/lib` that looks like this:
```json
{
    "name": "lib",
    "version": "1.0.0"
}
```

then, in the project's root directory:
```
npm install -s ./lib
```

The main `/package.json` will now have the local package declared:
```json
{
    "dependencies": {
        "lib": "file:lib"
    }
}
```

To use it:
```
const module1 = require('lib/modules1')
```

## Pros
- avoid those pesky `../../../` (though to be honest if you have too much of those you should probably reconsider your code structure / separation)
- code can be easily moved inside your project and you only need to `npm install` it again instead of changing all your `import` / `require` statements
- other pros?

## Cons
- uses symlinks under the hood

## Unknowns
- how does it work with bundlers?

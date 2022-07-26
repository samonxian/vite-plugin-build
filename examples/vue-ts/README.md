# vue-ts example

**注意**

如果要生成 typescript 声明文件，请按照例子使用 **vue-tsc**

```json
...
"scripts": {
  "tsc": "vue-tsc",
  "clean": "rimraf lib es dist",
  "build": "npm run clean && npm run tsc && vite build"
}
...
```

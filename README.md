g-mock是基于express的中间件，根据url匹配本地文件，提供mock功能

#### 安装
``npm install g-mock --save``


#### 使用
```javascript
const express = require('express')
const mockMiddlewareCreator = require('gd-mock')
const path = require('path')
const app = express()
const cwd = process.cwd()
app.use('/mock/*', mockMiddlewareCreator({prefix: '/mock', dir: path.resolve(cwd, 'mock')}))
app.listen(300)
```

#### 匹配规则
下划线开头的目录或文件会生成动态匹配

``
├─path
│      index.js
│      other.js
│      _id.js
│      
└─_path
        other.js
        id.js
        
``
如上目录结构将会转换成如下规则
``
 /path/
 /path/other
 /path/:id
 
 /:path/other  
 /:path/id 
``

同一个url如果命中多个规则，默认规则复杂度低的优先
比如，/mock/path/other ，同时命中   /path/other， /path/:id，/:path/other   ,/path/other该规则不含动态参数，复杂度最低，优先匹配

复杂度相同的话，按顺序匹配
比如 /mock/path/id 同时命中   /path/:id  /:path/id   ，这两个规则都含有动态参数，复杂度相同，但是/path/:id改规则对应目录在前，所以先匹配

原则上应当避免同一个url可以匹配多个规则

#### mock文件
每个文件导出一个函数，函数返回值为Mock值
```javascript
module.exports = () => {
    return {
        a: 'path-other'
    }
}
```

还可以返回Promise,模拟延时请求
```javascript
module.exports = () => {
   return new Promise((resolve,reject)=>{
       setTimeout(()=>{
           resolve({
               a: 'path'
           })
       },1000)
   })
}
```


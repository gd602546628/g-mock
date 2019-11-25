const cwd = process.cwd()
const path = require('path')
const fs = require('fs')
const pathToReg = require('path-to-regexp')

function middlewareCreator({prefix = '/mock', dir = path.resolve(cwd, 'mock')}) {
    return (req, res, next) => {
        const file = getMockFile(prefix, req.originalUrl, dir)
        if (!file) {
            response404(res,req)
        } else {
            responseSuccess(file, res)
        }
    }
}

class PathItem {
    constructor(filePath = '', urlPath = '', children = []) {
        this.filePath = filePath
        this.urlPath = urlPath
        this.children = []
    }
}

// mock文件夹解析为path树
function dirToTree(prefix, dir) {

    const result = new PathItem()
    let mockDir = []
    try {
        mockDir = fs.readdirSync(dir, {withFileTypes: true})
    } catch (e) {
        console.log('mock-middle【错误】:mock文件不存在,请传入mock文件夹绝对路径')
        return null
    }

    function getFileName(name) {
        return name.split('.')[0]
    }

    function walk(basePath, directory, result, baseUrl) {
        directory.forEach(item => {
            if (item.isDirectory()) {
                let dirItem = new PathItem()
                result.children.push(dirItem)
                const nextDirPath = path.resolve(basePath, item.name)
                const nextDir = fs.readdirSync(nextDirPath, {withFileTypes: true})
                let nextUrlPath = result.urlPath ? result.urlPath : baseUrl
                nextUrlPath += item.name.startsWith('_') ? '/:' : '/'
                nextUrlPath += item.name
                walk(nextDirPath, nextDir, dirItem, nextUrlPath)
            } else {
                if (item.name === 'index.js') {
                    result.urlPath = baseUrl
                    result.filePath = path.resolve(basePath, 'index.js')
                } else {
                    let obj = new PathItem()
                    obj.urlPath = baseUrl
                    obj.urlPath += item.name.startsWith('_') ? '/:' : '/'
                    obj.urlPath += getFileName(item.name)
                    obj.filePath = path.resolve(basePath, item.name)
                    result.children.push(obj)
                }
            }
        })
    }

    walk(dir, mockDir, result, prefix)
    return result
}

function getMockFile(prefix, originalUrl, dir) {
    const tree = dirToTree(prefix, dir)
    if (!tree) return []
    const matchs = []
    BFS(tree, (item) => {
        const re = pathToReg.pathToRegexp(item.urlPath)
        const match = re.exec(originalUrl)
        if (match) {
            matchs.push({match: match, reg: re, item: item})
        }
    })
    matchs.sort((a, b) => {
        return a.reg.toString().length - b.reg.toString().length
    })
    if (matchs[0]) {
        return matchs[0].item.filePath
    }
}

function BFS(tree, callback) { // 对path树的广度优先遍历,
    const queue = []
    queue.unshift(tree)
    while (queue.length !== 0) {
        const item = queue.shift()
        if (callback && callback(item)) {
            return
        }
        item.children && item.children.forEach(child => {
            queue.unshift(child)
        })
    }
}

function responseSuccess(file, res) {
    const fn = forceRequire(file)
    if (typeof fn !== 'function') {
        responseErr(res,file)
        return
    }
    let result = fn()
    if (typeof result.then === 'function') { // promise
        result.then(data => {
            responseJSON(res,data)
        })
    } else {
        responseJSON(res, result)
    }
}

function responseJSON(res, json) {
    const result = typeof json === 'object' ? JSON.stringify(json) : json
    res.end(result)
}

function response404(res,req) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<p>url:${req.originalUrl},没有匹配的Mock文件</p>`);
}

function responseErr(res,file) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<p>${file},该文件返回的不是函数,请检查</p>`);
}

function forceRequire(reqPath) { // 清除缓存，实现mock修改时能及时更新
    delete require.cache[reqPath];
    return require(reqPath);
}

module.exports = middlewareCreator
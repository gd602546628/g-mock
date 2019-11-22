const glob = require('glob')
const cwd = process.cwd()
const path = require('path')
const fs = require('fs')
const pathToReg = require('path-to-regexp')

function middlewareCreator({prefix = '/mock', dir = path.resolve(cwd, 'mock')}) {
    return (req, res, next) => {
        getMockFile(prefix, req.originalUrl, dir)
        res.end('sss')
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
    console.log(matchs)
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

function responseErr() {
}

function forceRequire(reqPath) {
    delete require.cache[reqPath];
    return require(reqPath);
}

module.exports = middlewareCreator
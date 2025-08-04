import { KdTree } from 'kd-tree-javascript/kdTree.js';

// 定义距离函数
function distance(a, b) {
    return Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2);
}

// 定义 kd-tree 的点取值函数
function getPoint(point) {
    return [point.x, point.y, point.z];
}

// 创建 kd-tree
function createKdTree(points) {
    return new KdTree(points, distance, ["x", "y", "z"]);
}

// 查找最近点
function findNearestUsingKdTree(tree, targetPoint) {
    let nearest = tree.nearest(targetPoint, 1);
    return nearest[0][0]; // nearest 返回一个数组，数组中的每一项是 [point, distance]
}

export {
    createKdTree,
    findNearestUsingKdTree
}
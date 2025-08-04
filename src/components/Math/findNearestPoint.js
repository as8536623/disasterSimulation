import * as THREE from 'three';

// 函数：计算两个点之间的距离
function distanceSquared(point1, point2) {
    return point1.distanceToSquared(point2);
}

// 函数：寻找最近的点
function findNearestPoint(targetPoint, points) {
    let nearestPoint = null;
    let nearestIndex = -1;
    let minDistance = Infinity;

    for (let i = 0; i < points.length; i++) {
        let point = points[i];
        if (point.equals(targetPoint)) continue; // 跳过自身

        let dist = distanceSquared(targetPoint, point);
        if (dist < minDistance) {
            minDistance = dist;
            nearestPoint = point;
            nearestIndex = i;
        }
    }

    return {nearestPoint,nearestIndex};
}


export {
    findNearestPoint
}

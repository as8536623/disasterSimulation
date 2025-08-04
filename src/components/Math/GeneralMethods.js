import * as THREE from 'three';
import * as YUKA from 'yuka';

//将YUKA的一组点转为Three.js的一组点
function getThreePoints(path){
    let points = [];
    path.map((p)=>{
        points.push(getThreePoint(p));
    });

    return points
}
//将一个YUKA的点转为一个THREE.js的点
function getThreePoint(v3){
    return new THREE.Vector3(v3.x, v3.y,v3.z);
}

function getYUKAPoints(path){
    let points = [];
    path.map((p)=>{
        points.push(getThreePoint(p));
    });

    return points
}
function getYUKAPoint(v3){
    return new YUKA.Vector3(v3.x, v3.y, v3.z);
}

// CSS2DObject对象销毁
// 要销毁这个 CSS2DObject
function destroyCSS2DObject(css2dObject) {
    // 1. 从父对象中移除
    if (css2dObject.parent) {
        css2dObject.parent.remove(css2dObject);
    }

    // 2. 清理其子对象
    while (css2dObject.children.length > 0) {
        destroyCSS2DObject(css2dObject.children[0]);
    }

    // 3. 删除 DOM 元素
    if (css2dObject.element && css2dObject.element.parentNode) {
        css2dObject.element.parentNode.removeChild(css2dObject.element);
    }

    // 4. 清理自身的引用
    css2dObject.element = null;
}

//计算一组点的最小包围盒的方向
function getMinimumBoundingRectangle(points) {
    const obb = new YUKA.OBB();
    obb.fromPoints(points);

    console.log(obb);
    const matrixElements = obb.rotation.elements;

    const matrix4 = new THREE.Matrix4();
    matrix4.set(
        matrixElements[0], matrixElements[1], matrixElements[2], 0,
        matrixElements[3], matrixElements[4], matrixElements[5], 0,
        matrixElements[6], matrixElements[7], matrixElements[8], 0,
        0, 0, 0, 1
    );

// 将矩阵转换为四元数
    const quaternion = new THREE.Quaternion();
    quaternion.setFromRotationMatrix(matrix4);

// 如果需要欧拉角表示
    const euler = new THREE.Euler();
    euler.setFromQuaternion(quaternion, 'XYZ');

    return euler;
}

function getEulerRotation(vector1,vector2){
    // 计算叉积（用于获得旋转轴）
    const crossProduct = new THREE.Vector3().crossVectors(vector1, vector2);

// 计算点积
    const dotProduct = vector1.dot(vector2);

// 计算模长
    const length1 = vector1.length();
    const length2 = vector2.length();

// 计算余弦值
    const cosTheta = dotProduct / (length1 * length2);

// 计算角度（弧度）
    const angleInRadians = Math.acos(cosTheta);

// 创建一个四元数来表示旋转
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(crossProduct.normalize(), angleInRadians);

// 转换为欧拉角表示的旋转
    const eulerRotation = new THREE.Euler().setFromQuaternion(quaternion, 'XYZ');
    const eulerRotationDegrees = new THREE.Vector3(
        THREE.MathUtils.radToDeg(eulerRotation.x),
        THREE.MathUtils.radToDeg(eulerRotation.y),
        THREE.MathUtils.radToDeg(eulerRotation.z),
    );

// 输出欧拉角
    //console.log('Euler rotation:', eulerRotation);
    return eulerRotationDegrees;
}

function getEulerRotation2(vector1,vector2){

// 计算点积
    const dotProduct = vector1.dot(vector2);

// 计算模长
    const length1 = vector1.length();
    const length2 = vector2.length();

// 计算余弦值
    const cosTheta = dotProduct / (length1 * length2);

// 计算角度（弧度）
    const angleInRadians = Math.acos(cosTheta);

    //返回角度
    return THREE.MathUtils.radToDeg(angleInRadians);
}

/**
 * 计算给定点到线段的最近点
 * @param {THREE.Vector3} p - 给定的点
 * @param {THREE.Vector3} a - 线段的起点
 * @param {THREE.Vector3} b - 线段的终点
 * @returns {THREE.Vector3} - 线段上离给定点最近的点
 */
function closestPointOnLineSegment(p, a, b) {
    const ab = b.clone().sub(a); // 向量 ab
    const ap = p.clone().sub(a); // 向量 ap
    const ab_ap_product = ap.dot(ab);
    const ab_ab_product = ab.dot(ab);
    let t = ab_ap_product / ab_ab_product;

    // 约束 t 在 [0, 1] 之间
    t = Math.max(0, Math.min(1, t));

    // 计算最近点
    return a.clone().add(ab.multiplyScalar(t));
}

/**
 * 找到给定点到几何体边界上最近的点
 * @param {THREE.Vector3} givenPoint - 给定的点
 * @param {THREE.Vector3[]} vertices - 边界顶点数组（Vector3的数组）
 * @returns {THREE.Vector3} - 边界上离给定点最近的点
 */
function findClosestPointOnBoundary(givenPoint, vertices) {
    let closestPoint = null;
    let minDistance = Infinity;

    // 遍历所有线段，寻找最近的点
    for (let i = 0; i < vertices.length; i += 2) {
        const a = vertices[i];
        const b = vertices[i + 1];
        const pointOnSegment = closestPointOnLineSegment(givenPoint, a, b);
        const distance = givenPoint.distanceTo(pointOnSegment);

        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = pointOnSegment;
        }
    }

    return closestPoint;
}


export {
    getThreePoints,
    getThreePoint,
    getYUKAPoints,
    getYUKAPoint,
    destroyCSS2DObject,
    getMinimumBoundingRectangle,
    getEulerRotation,
    getEulerRotation2,
    closestPointOnLineSegment,
    findClosestPointOnBoundary
};
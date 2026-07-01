// 3D ellipsoid rendering math for the canvas software renderer (no WebGL).
//
// A sphere or ellipsoid is a quadric surface. Its outline (silhouette) under
// orthographic projection along the view axis is always a closed-form ellipse,
// so we can render rotatable, depth-sorted 3D shapes on a plain 2D canvas —
// which works on offline IE11 terminals where WebGL may be unavailable.
//
// All functions are pure and depend only on Math (IE11-safe).

// rotationMatrix builds a 3x3 rotation from yaw (about the vertical Y axis) and
// pitch (about the horizontal X axis), returned as a flat row-major array of 9.
// R = Rx(pitch) * Ry(yaw)
export function rotationMatrix(yaw, pitch) {
  var cy = Math.cos(yaw), sy = Math.sin(yaw);
  var cp = Math.cos(pitch), sp = Math.sin(pitch);
  // Ry(yaw):  [ cy, 0, sy;  0, 1, 0;  -sy, 0, cy ]
  // Rx(pitch):[ 1, 0, 0;  0, cp, -sp;  0, sp, cp ]
  // R = Rx * Ry
  return [
    cy, 0, sy,
    sp * sy, cp, -sp * cy,
    -cp * sy, sp, cp * cy
  ];
}

// rotatePoint applies a 3x3 (flat) rotation matrix to a [x,y,z] point.
export function rotatePoint(R, p) {
  return [
    R[0] * p[0] + R[1] * p[1] + R[2] * p[2],
    R[3] * p[0] + R[4] * p[1] + R[5] * p[2],
    R[6] * p[0] + R[7] * p[1] + R[8] * p[2]
  ];
}

// rotatePointTranspose applies R^T (the inverse of a rotation) to a point.
// Used to map a screen-plane drag back into world coordinates.
export function rotatePointTranspose(R, p) {
  return [
    R[0] * p[0] + R[3] * p[1] + R[6] * p[2],
    R[1] * p[0] + R[4] * p[1] + R[7] * p[2],
    R[2] * p[0] + R[5] * p[1] + R[8] * p[2]
  ];
}

// IDENTITY is the no-op 3x3 rotation (axis-aligned shapes).
export var IDENTITY = [1, 0, 0, 0, 1, 0, 0, 0, 1];

// multiply3 multiplies two 3x3 (flat, row-major) matrices: returns a * b.
export function multiply3(a, b) {
  var r = new Array(9);
  for (var i = 0; i < 3; i++) {
    for (var j = 0; j < 3; j++) {
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
    }
  }
  return r;
}

// silhouetteEllipse computes the on-screen outline of a rotated ellipsoid.
//
// sceneR : 3x3 scene/view rotation (drag), applied to both shape and center
// orient : 3x3 local orientation of the shape itself (e.g. uterus ante/retro
//          version); pass IDENTITY for axis-aligned shapes
// center : [x,y,z] center in world units (mm)
// radii  : [rx,ry,rz] semi-axes in scene units (mm); a sphere has rx=ry=rz
//
// Returns { x, y, depthZ, semiMajor, semiMinor, angle } where (x,y) is the
// projected center, depthZ the rotated z (for painter's depth sort), semiMajor/
// semiMinor the ellipse half-axes (mm), and angle the major-axis tilt (rad).
//
// Math: with A = diag(1/rx^2, 1/ry^2, 1/rz^2), the rotated ellipsoid is
// q^T M q = 1 where M = E A E^T and E = sceneR * orient. Splitting M into the
// (x,y) block M11, the z coupling m12 and the scalar m22, the orthographic
// silhouette is the 2x2 conic C = M11 - (m12 m12^T)/m22, whose eigen-
// decomposition gives the ellipse.
export function silhouetteEllipse(sceneR, orient, center, radii) {
  var R = multiply3(sceneR, orient); // effective rotation of the ellipsoid axes
  var a0 = 1 / (radii[0] * radii[0]);
  var a1 = 1 / (radii[1] * radii[1]);
  var a2 = 1 / (radii[2] * radii[2]);

  // M = R A R^T (symmetric). M_ij = sum_k R_ik * a_k * R_jk.
  function m(i, j) {
    var ri = i * 3, rj = j * 3;
    return R[ri] * a0 * R[rj] +
           R[ri + 1] * a1 * R[rj + 1] +
           R[ri + 2] * a2 * R[rj + 2];
  }
  var M00 = m(0, 0), M01 = m(0, 1), M02 = m(0, 2);
  var M11 = m(1, 1), M12 = m(1, 2);
  var M22 = m(2, 2); // always > 0, so no division-by-zero below

  // C = M11block - (m12 m12^T) / m22  (Schur complement)
  var ca = M00 - (M02 * M02) / M22;
  var cb = M01 - (M02 * M12) / M22;
  var cd = M11 - (M12 * M12) / M22;

  // Eigenvalues of [[ca, cb],[cb, cd]].
  var tr = ca + cd;
  var disc = Math.sqrt(Math.max(0, (ca - cd) * (ca - cd) + 4 * cb * cb));
  var lambdaBig = (tr + disc) / 2;   // larger eigenvalue -> shorter axis
  var lambdaSmall = (tr - disc) / 2; // smaller eigenvalue -> longer axis

  // Semi-axis length along an eigenvector v is 1/sqrt(eigenvalue).
  var semiMajor = 1 / Math.sqrt(Math.max(lambdaSmall, 1e-9));
  var semiMinor = 1 / Math.sqrt(Math.max(lambdaBig, 1e-9));

  // Major-axis direction = eigenvector of the smaller eigenvalue.
  // Eigenvector of [[ca,cb],[cb,cd]] for lambda is [cb, lambda - ca].
  var angle = Math.atan2(lambdaSmall - ca, cb);

  var rc = rotatePoint(sceneR, center);
  return {
    x: rc[0],
    y: rc[1],
    depthZ: rc[2],
    semiMajor: semiMajor,
    semiMinor: semiMinor,
    angle: angle
  };
}

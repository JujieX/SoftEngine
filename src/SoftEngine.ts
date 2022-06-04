import { Vector2, Vector3, Color, Matrix, Quaternion } from "oasis-engine";

export module SoftEngine {
  export interface Face {
    A: number;
    B: number;
    C: number;
  }
  export class Camera {
    Position: Vector3;
    Target: Vector3;

    constructor() {
      this.Position = new Vector3(0.0, 0.0, 0.0);
      this.Target = new Vector3(0.0, 0.0, 0.0);
    }
  }
  export class Mesh {
    Position: Vector3;
    Rotation: Vector3;
    Vertices: Vector3[];
    Faces: Face[];

    constructor(
      public name: string,
      verticesCount: number,
      facesCount: number
    ) {
      this.Vertices = new Array(verticesCount);
      this.Faces = new Array(facesCount);
      this.Rotation = new Vector3(0.0, 0.0, 0.0);
      this.Position = new Vector3(0.0, 0.0, 0.0);
    }
  }

  export class Device {
    private backbuffer: ImageData;
    private workingCanvas: HTMLCanvasElement;
    private workingContext: CanvasRenderingContext2D;
    private workingWidth: number;
    private workingHeight: number;
    private backbufferdata: any;

    constructor(canvas: HTMLCanvasElement) {
      this.workingCanvas = canvas;
      this.workingWidth = canvas.width;
      this.workingHeight = canvas.height;
      this.workingContext = this.workingCanvas.getContext("2d");
    }

    public clear(): void {
      this.workingContext.clearRect(
        0,
        0,
        this.workingWidth,
        this.workingHeight
      );

      this.backbuffer = this.workingContext.getImageData(
        0,
        0,
        this.workingWidth,
        this.workingHeight
      );
    }

    public present(): void {
      this.workingContext.putImageData(this.backbuffer, 0, 0);
    }

    public putPixel(x: number, y: number, color: Color): void {
      this.backbufferdata = this.backbuffer.data;
      var index: number = ((x >> 0) + (y >> 0) * this.workingWidth) * 4;

      this.backbufferdata[index] = color.r * 255;
      this.backbufferdata[index + 1] = color.g * 255;
      this.backbufferdata[index + 2] = color.b * 255;
      this.backbufferdata[index + 3] = color.a * 255;
    }

    public project(coord: Vector3, transMat: Matrix): Vector2 {
      let point = new Vector3();
      Vector3.transformCoordinate(coord, transMat, point);
      var x = (point.x * this.workingWidth + this.workingWidth / 2.0) >> 0;
      var y = (-point.y * this.workingHeight + this.workingHeight / 2.0) >> 0;
      console.log(x, y);
      return new Vector2(x, y);
    }

    public drawPoint(point: Vector2): void {
      if (
        point.x >= 0 &&
        point.y >= 0 &&
        point.x < this.workingWidth &&
        point.y < this.workingHeight
      ) {
        this.putPixel(point.x, point.y, new Color(1, 1, 0, 1));
      }
    }

    public drawLine(point0: Vector2, point1: Vector2): void {
      let tempVec2 = new Vector2();
      Vector2.subtract(point0, point1, tempVec2);
      let dist = tempVec2.length();
      if (dist < 2) return;

      let middlePoint = new Vector2();
      Vector2.add(point0, tempVec2.scale(0.5), middlePoint);

      this.drawPoint(middlePoint);

      this.drawLine(point0, middlePoint);
      this.drawLine(middlePoint, point1);
    }

    public drawBline(point0: Vector2, point1: Vector2): void {
      var x0 = point0.x >> 0;
      var y0 = point0.y >> 0;
      var x1 = point1.x >> 0;
      var y1 = point1.y >> 0;
      var dx = Math.abs(x1 - x0);
      var dy = Math.abs(y1 - y0);
      var sx = x0 < x1 ? 1 : -1;
      var sy = y0 < y1 ? 1 : -1;
      var err = dx - dy;

      while (true) {
        this.drawPoint(new Vector2(x0, y0));

        if (x0 == x1 && y0 == y1) break;
        var e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x0 += sx;
        }
        if (e2 < dx) {
          err += dx;
          y0 += sy;
        }
      }
    }

    public render(camera: Camera, meshes: Mesh[]): void {
      let upVector = new Vector3(0.0, 1.0, 0.0);
      let viewMatrix = new Matrix();
      let projectionMatrix = new Matrix();
      Matrix.lookAt(camera.Position, camera.Target, upVector, viewMatrix);
      Matrix.perspective(
        0.78,
        this.workingWidth / this.workingHeight,
        0.01,
        100,
        projectionMatrix
      );

      for (var index = 0; index < meshes.length; index++) {
        var cMesh = meshes[index];
        let rotationQuat = new Quaternion();
        let rotationMat = new Matrix();
        let translateVec = new Vector3(
          cMesh.Position.x,
          cMesh.Position.y,
          cMesh.Position.z
        );
        let translateMat = new Matrix();
        let worldMatrix = new Matrix();

        Quaternion.rotationYawPitchRoll(
          cMesh.Rotation.y,
          cMesh.Rotation.x,
          cMesh.Rotation.z,
          rotationQuat
        );
        Matrix.rotationQuaternion(rotationQuat, rotationMat);
        Matrix.translation(translateVec, translateMat);
        Matrix.multiply(translateMat, rotationMat, worldMatrix);
        let tempMat = new Matrix();
        let transformMatrix = new Matrix();
        Matrix.multiply(viewMatrix, worldMatrix, tempMat);
        Matrix.multiply(projectionMatrix, tempMat, transformMatrix);

        for (
          var indexFaces = 0;
          indexFaces < cMesh.Faces.length;
          indexFaces++
        ) {
          var currentFace = cMesh.Faces[indexFaces];
          var vertexA = cMesh.Vertices[currentFace.A];
          var vertexB = cMesh.Vertices[currentFace.B];
          var vertexC = cMesh.Vertices[currentFace.C];

          var pixelA = this.project(vertexA, transformMatrix);
          var pixelB = this.project(vertexB, transformMatrix);
          var pixelC = this.project(vertexC, transformMatrix);

          this.drawBline(pixelA, pixelB);
          this.drawBline(pixelB, pixelC);
          this.drawBline(pixelC, pixelA);
        }
      }
    }
  }
}

import test from "node:test";
import assert from "node:assert/strict";
import { fittedImageSize, optimizeImage } from "./image-optimize";

test("小图不放大，横竖图等比例限制最长边", () => {
  assert.deepEqual(fittedImageSize(400, 300), {width:400,height:300});
  assert.deepEqual(fittedImageSize(6000, 4000), {width:3200,height:2133});
  assert.deepEqual(fittedImageSize(2000, 8000), {width:800,height:3200});
});

test("采用更小编码，PNG保留格式，编码增大时保留原文件", async () => {
  const bitmapDescriptor = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
  let encodedSize = 100;
  let encodedType = "";
  let closed = 0;
  Object.defineProperty(globalThis, "createImageBitmap", {configurable:true, value: async () => ({width:6000,height:4000,close:()=>closed++})});
  Object.defineProperty(globalThis, "document", {configurable:true, value:{createElement:()=>({getContext:()=>({drawImage:()=>{}}),toBlob:(cb:(blob:Blob)=>void,type:string)=>{encodedType=type;cb(new Blob([new Uint8Array(encodedSize)],{type}));}})}});
  try {
    const file = new File([new Uint8Array(1024)], "text.png", {type:"image/png"});
    assert.equal((await optimizeImage(file)).size,100);
    assert.equal(encodedType,"image/png");
    encodedSize=2048;
    assert.equal(await optimizeImage(file),file);
    assert.equal(closed,2);
  } finally {
    if(bitmapDescriptor) Object.defineProperty(globalThis,"createImageBitmap",bitmapDescriptor); else Reflect.deleteProperty(globalThis,"createImageBitmap");
    if(documentDescriptor) Object.defineProperty(globalThis,"document",documentDescriptor); else Reflect.deleteProperty(globalThis,"document");
  }
});

test("拒绝无法读取或像素过大的图片", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "createImageBitmap");
  const file = new File([new Uint8Array(8)], "image.png", { type: "image/png" });
  try {
    Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: async () => { throw new Error("decode"); } });
    await assert.rejects(optimizeImage(file), /图片无法读取/);
    Object.defineProperty(globalThis, "createImageBitmap", { configurable: true, value: async () => ({ width: 20_000, height: 20_000, close() {} }) });
    await assert.rejects(optimizeImage(file), /图片像素过大/);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "createImageBitmap", descriptor);
    else Reflect.deleteProperty(globalThis, "createImageBitmap");
  }
});

interface GPUAdapter {
  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
}

interface GPUDeviceDescriptor {
  nonGuaranteedFeatures?: Iterable<string>;
}

interface GPUDevice extends GPUBase {
  queue: GPUQueue;
  createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
  createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
  createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
  createSampler(descriptor: GPUSamplerDescriptor): GPUSampler;
}

interface GPUBase {
  label: string | null;
  destroy(): void;
}

interface GPUQueue {
  submit(buffers: GPUCommandBuffer[]): void;
  copyExternalImageToTexture(source: GPUImageCopyExternalSource, destination: GPUImageCopyTextureTagged, copySize: GPUExtent3D): void;
  writeTexture(destination: GPUImageCopyTexture, data: BufferSource, dataLayout: GPUImageDataLayout, copySize: GPUExtent3D): void;
}

interface GPUBuffer {
  mapAsync(mode: GPUMapModeFlags, offset?: number, size?: number): void;
  getMappedRange(): ArrayBuffer;
  unmap(): void;
  destroy(): void;
}

interface GPUTexture {
  createView(descriptor?: GPUTextureViewDescriptor): GPUTextureView;
  destroy(): void;
}

interface GPUTextureView {
  destroy(): void;
}

interface GPUShaderModule {
  destroy(): void;
}

interface GPUBindGroup {
  destroy(): void;
}

interface GPUBindGroupLayout {
  destroy(): void;
}

interface GPUPipelineLayout {
  destroy(): void;
}

interface GPURenderPipeline {
  destroy(): void;
}

interface GPUSampler {
  destroy(): void;
}

interface GPUCommandEncoder {
  beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder;
  copyTextureToBuffer(source: GPUImageCopyTexture, destination: GPUImageCopyBuffer, copySize: GPUExtent3D): void;
  copyBufferToTexture(source: GPUImageCopyBuffer, destination: GPUImageCopyTexture, copySize: GPUExtent3D): void;
  finish(): GPUCommandBuffer;
}

interface GPURenderPassEncoder {
  setPipeline(pipeline: GPURenderPipeline): void;
  setBindGroup(index: number, bindGroup: GPUBindGroup, dynamicOffsets?: number[]): void;
  draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
  end(): void;
}

interface GPUCommandBuffer {
  destroy(): void;
}

interface GPUBufferDescriptor {
  label?: string;
  size: number;
  usage: GPUBufferUsageFlags;
  mappedAtCreation?: boolean;
}

interface GPUTextureDescriptor {
  label?: string;
  size: GPUExtent3D;
  format: GPUTextureFormat;
  usage: GPUTextureUsageFlags;
  viewFormats?: GPUTextureFormat[];
}

interface GPUTextureViewDescriptor {
  label?: string;
  format?: GPUTextureFormat;
  dimension?: GPUTextureViewDimension;
  aspect?: GPUTextureAspect;
  baseMipLevel?: number;
  mipLevelCount?: number;
  baseArrayLayer?: number;
  arrayLayerCount?: number;
}

interface GPUShaderModuleDescriptor {
  label?: string;
  code: string;
}

interface GPUBindGroupDescriptor {
  label?: string;
  layout: GPUBindGroupLayout;
  entries: GPUBindGroupEntry[];
}

interface GPUBindGroupLayoutDescriptor {
  label?: string;
  entries: GPUBindGroupLayoutEntry[];
}

interface GPUPipelineLayoutDescriptor {
  label?: string;
  bindGroupLayouts: GPUBindGroupLayout[];
}

interface GPUShaderModuleDescriptor {
  label?: string;
  code: GPUString;
}

interface GPURenderPipelineDescriptor {
  label?: string;
  layout: GPUPipelineLayout | GPUAutoLayoutMode;
  vertex: GPUVertexState;
  primitive: GPUPrimitiveState;
  fragment?: GPUFragmentState;
  depthStencil?: GPUDepthStencilState;
  multiview?: GPUMultiviewState;
}

interface GPURenderPipeline {
  label: string | null;
}

interface GPUBindGroupLayout {
  destroy(): void;
}

interface GPUVertexState {
  module: GPUShaderModule;
  entryPoint: string;
  buffers?: GPUVertexBufferLayout[];
}

interface GPUFragmentState {
  module: GPUShaderModule;
  entryPoint: string;
  targets: GPUColorTargetState[];
}

interface GPUPrimitiveState {
  topology: GPUPrimitiveTopology;
  cullMode?: GPUCullMode;
  frontFace?: GPUFrontFace;
}

interface GPUColorTargetState {
  format: GPUTextureFormat;
  blend?: GPUBlendState;
  writeMask?: GPUColorWrite;
}

interface GPUBlendState {
  color: GPUBlendComponent;
  alpha: GPUBlendComponent;
}

interface GPUBlendComponent {
  operation: GPUBlendOperation;
  srcFactor: GPUBlendFactor;
  dstFactor: GPUBlendFactor;
}

interface GPUDepthStencilState {
  format: GPUTextureFormat;
  depthWriteEnabled: boolean;
  depthCompare: GPUCompareFunction;
  stencilFront: GPUStencilState;
  stencilBack: GPUStencilState;
}

interface GPUStencilState {
  compare: GPUCompareFunction;
  failOp: GPUStencilOperation;
  depthFailOp: GPUStencilOperation;
  passOp: GPUStencilOperation;
}

interface GPUSamplerDescriptor {
  label?: string;
  magFilter?: GPUFilterMode;
  minFilter?: GPUFilterMode;
  mipmapFilter?: GPUFilterMode;
  addressModeU?: GPUAddressMode;
  addressModeV?: GPUAddressMode;
  addressModeW?: GPUAddressMode;
  lodMinClamp?: number;
  lodMaxClamp?: number;
  compare?: GPUCompareFunction;
  anisotropyMax?: number;
}

interface GPURenderPassDescriptor {
  label?: string;
  colorAttachments: GPURenderPassColorAttachment[];
  depthStencilAttachment?: GPURenderPassDepthStencilAttachment;
}

interface GPURenderPassColorAttachment {
  view: GPUTextureView;
  resolveTarget?: GPUTextureView;
  loadOp: GPULoadOp;
  storeOp: GPUStoreOp;
  clearValue?: GPUColor;
}

interface GPURenderPassDepthStencilAttachment {
  view: GPUTextureView;
  depthLoadOp: GPULoadOp;
  depthStoreOp: GPUStoreOp;
  clearValue: number;
  stencilLoadOp: GPULoadOp;
  stencilStoreOp: GPUStoreOp;
  stencilClearValue: number;
}

interface GPUImageCopyExternalSource {
  source: ImageData | HTMLVideoElement;
}

interface GPUImageCopyTexture {
  texture: GPUTexture;
  mipLevel?: number;
  origin?: GPUOrigin3D;
}

interface GPUImageCopyTextureTagged extends GPUImageCopyTexture {
  colorSpace?: GPUColorSpace;
  premultipliedAlpha?: boolean;
}

interface GPUImageCopyBuffer {
  buffer: GPUBuffer;
  layout: GPUImageDataLayout;
}

interface GPUImageDataLayout {
  offset?: number;
  bytesPerRow?: number;
  rowsPerImage?: number;
}

type GPUString = string;

type GPUBufferUsageFlags = number;
type GPUTextureUsageFlags = number;
type GPUMapModeFlags = number;
type GPUShaderStageFlags = number;
type GPUColorWrite = number;
type GPUBindGroupIndex = number;
type GPUExtent3D = [number, number, number?];
type GPUOrigin3D = [number, number, number?];
type GPUIntegerCoordinate = number;
type GPUSize64 = number;
type GPUFlags = number;

type GPUAddressMode = "clamp-to-edge" | "repeat" | "mirror-repeat";
type GPUBlendFactor = "zero" | "one" | "src-color" | "one-minus-src-color" | "dst-color" | "one-minus-dst-color" | "src-alpha" | "one-minus-src-alpha" | "dst-alpha" | "one-minus-dst-alpha" | "constant-color" | "one-minus-constant-color" | "constant-alpha" | "one-minus-constant-alpha" | "src1-color" | "one-minus-src1-color" | "src1-alpha" | "one-minus-src1-alpha";
type GPUBlendOperation = "add" | "subtract" | "reverse-subtract" | "min" | "max";
type GPUBuiltin = "vertex-index" | "instance-index" | "position" | "front-facing" | "sample-index" | "sample-mask" | "local-invocation-id" | "local-invocation-index" | "global-invocation-id" | "global-invocation-index" | "workgroup-id" | "num-workgroups" | "sample-mask-out" | "frag-depth";
type GPUCompareFunction = "never" | "less" | "equal" | "less-than-equal" | "greater" | "not-equal" | "greater-than-equal" | "always";
type GPUCullMode = "none" | "front" | "back";
type GPUFilterMode = "nearest" | "linear";
type GPUFrontFace = "ccw" | "cw";
type GPULoadOp = "load" | "clear";
type GPUStoreOp = "store" | "discard";
type GPUPrimitiveTopology = "point-list" | "line-list" | "line-strip" | "triangle-list" | "triangle-strip";
type GPUColorSpace = "srgb" | "display-p3";
type GPUAutoLayoutMode = "auto";
type GPUStencilOperation = "keep" | "zero" | "replace" | "invert" | "increment-clamp" | "decrement-clamp" | "increment-wrap" | "decrement-wrap";
type GPUMultiviewState = { arrayLayerCount: number };
type GPUTextureAspect = "all" | "stencil-only" | "depth-only";
type GPUTextureViewDimension = "1d" | "2d" | "2d-array" | "cube" | "cube-array" | "3d";
type GPUTextureFormat = "r8unorm" | "r8snorm" | "r8uint" | "r8sint" | "r16uint" | "r16snorm" | "r16float" | "rg8unorm" | "rg8snorm" | "rg8uint" | "rg8sint" | "rg16uint" | "rg16snorm" | "rg16float" | "rgba8unorm" | "rgba8unorm-srgb" | "rgba8snorm" | "rgba8uint" | "rgba8sint" | "rgba16uint" | "rgba16snorm" | "rgba16float" | "rgba32float" | "rgba32uint" | "rgba32sint" | "rgb10a2unorm" | "rg11b10float" | "rgb9e5float" | "bc1-rgba-unorm" | "bc1-rgba-srgb" | "bc2-rgba-unorm" | "bc2-rgba-srgb" | "bc3-rgba-unorm" | "bc3-rgba-srgb" | "bc4-r-unorm" | "bc4-r-snorm" | "bc5-rg-unorm" | "bc5-rg-snorm" | "bc6h-rgbfloat" | "bc6h-rgb-ufloat" | "bc7-rgba-unorm" | "bc7-rgba-srgb" | "etc2-rgb8unorm" | "etc2-rgb8srgb" | "etc2-rgba8unorm" | "etc2-rgba8srgb" | "eac-r11unorm" | "eac-r11snorm" | "eac-rg11unorm" | "eac-rg11snorm" | "astc-4x4-unorm" | "astc-4x4-srgb" | "astc-5x4-unorm" | "astc-5x4-srgb" | "astc-5x5-unorm" | "astc-5x5-srgb" | "astc-6x5-unorm" | "astc-6x5-srgb" | "astc-6x6-unorm" | "astc-6x6-srgb" | "astc-8x5-unorm" | "astc-8x5-srgb" | "astc-8x6-unorm" | "astc-8x6-srgb" | "astc-8x8-unorm" | "astc-8x8-srgb" | "astc-10x5-unorm" | "astc-10x5-srgb" | "astc-10x6-unorm" | "astc-10x6-srgb" | "astc-10x8-unorm" | "astc-10x8-srgb" | "astc-10x10-unorm" | "astc-10x10-srgb" | "astc-12x10-unorm" | "astc-12x10-srgb" | "astc-12x12-unorm" | "astc-12x12-srgb" | "depth16unorm" | "depth32float" | "stencil8" | "depth24plus" | "depth24plus-stencil8" | "depth32float-stencil8" | "rgb9e5float" | "bc1-rgba-unorm" | "bc1-rgba-srgb" | "bc2-rgba-unorm" | "bc2-rgba-srgb" | "bc3-rgba-unorm" | "bc3-rgba-srgb";

type GPUBufferUsage = {
  MAP_READ: 0x0001;
  MAP_WRITE: 0x0002;
  COPY_SRC: 0x0004;
  COPY_DST: 0x0008;
  INDEX: 0x0010;
  VERTEX: 0x0020;
  UNIFORM: 0x0040;
  STORAGE: 0x0080;
  INDIRECT: 0x0100;
  QUERY_RESOLVE: 0x0200;
};

interface GPUBufferUsage {
  MAP_READ: 0x0001;
  MAP_WRITE: 0x0002;
  COPY_SRC: 0x0004;
  COPY_DST: 0x0008;
  INDEX: 0x0010;
  VERTEX: 0x0020;
  UNIFORM: 0x0040;
  STORAGE: 0x0080;
  INDIRECT: 0x0100;
  QUERY_RESOLVE: 0x0200;
}

type GPUTextureUsage = {
  COPY_SRC: 0x01;
  COPY_DST: 0x02;
  TEXTURE_BINDING: 0x04;
  STORAGE_BINDING: 0x08;
  RENDER_ATTACHMENT: 0x10;
};

interface GPUTextureUsage {
  COPY_SRC: 0x01;
  COPY_DST: 0x02;
  TEXTURE_BINDING: 0x04;
  STORAGE_BINDING: 0x08;
  RENDER_ATTACHMENT: 0x10;
}

type GPUColorWrite = {
  RED: 0x1;
  GREEN: 0x2;
  BLUE: 0x4;
  ALPHA: 0x8;
  ALL: 0xF,
};

interface GPUColorWrite {
  RED: 0x1;
  GREEN: 0x2;
  BLUE: 0x4;
  ALPHA: 0x8;
  ALL: 0xF;
}

type GPUShaderStage = {
  VERTEX: 0x1;
  FRAGMENT: 0x2;
  COMPUTE: 0x4,
};

interface GPUShaderStage {
  VERTEX: 0x1;
  FRAGMENT: 0x2;
  COMPUTE: 0x4;
}

interface GPUColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface GPURequestAdapterOptions {
  powerPreference?: GPUPowerPreference;
  compatibleSurface?: GPUSurface | null;
  forceFallbackAdapter?: boolean;
}

type GPUPowerPreference = "low-power" | "high-performance" | "default";

interface GPUSurface {
  configure(config: GPUSurfaceConfiguration): void;
  getCurrentTexture(): GPUTexture;
  present(): void;
}

interface GPUSurfaceConfiguration {
  device: GPUDevice;
  format: GPUTextureFormat;
  size: GPUExtent3D;
}

interface GPUBindGroupLayoutEntry {
  binding: number;
  visibility: GPUShaderStageFlags;
  buffer?: GPUBufferBindingLayout;
  sampler?: GPUSamplerBindingLayout;
  texture?: GPUTextureBindingLayout;
  storageTexture?: GPUStorageTextureBindingLayout;
}

interface GPUBufferBindingLayout {
  type?: GPUBufferBindingType;
  hasDynamicOffset?: boolean;
  minBindingSize?: GPUSize64;
}

type GPUBufferBindingType = "uniform" | "storage" | "read-only-storage";

interface GPUSamplerBindingLayout {
  type?: GPUSamplerBindingType;
}

type GPUSamplerBindingType = "filtering" | "non-filtering" | "comparison";

interface GPUTextureBindingLayout {
  sampleType?: GPUTextureSampleType;
  viewDimension?: GPUTextureViewDimension;
  multisampled?: boolean;
}

type GPUTextureSampleType = "float" | "unfilterable-float" | "depth" | "sint" | "uint";

interface GPUStorageTextureBindingLayout {
  access?: GPUStorageTextureAccess;
  format: GPUTextureFormat;
  viewDimension?: GPUTextureViewDimension;
}

type GPUStorageTextureAccess = "read-only" | "read-write" | "write-only";

interface GPUBindGroupEntry {
  binding: number;
  resource: GPUBuffer | GPUTextureView | GPUSampler;
}

interface GPUVertexBufferLayout {
  arrayStride?: number;
  stepMode?: GPUVertexStepMode;
  attributes?: GPUVertexAttribute[];
}

interface GPUVertexAttribute {
  format: GPUVertexFormat;
  offset: GPUSize64;
  shaderLocation: number;
}

type GPUVertexStepMode = "vertex" | "instance";

type GPUVertexFormat = "uint8x2" | "uint8x4" | "sint8x2" | "sint8x4" | "unorm8x2" | "unorm8x4" | "snorm8x2" | "snorm8x4" | "uint16x2" | "uint16x4" | "sint16x2" | "sint16x4" | "unorm16x2" | "unorm16x4" | "snorm16x2" | "snorm16x4" | "float16x2" | "float16x4" | "float32" | "float32x2" | "float32x3" | "float32x4" | "uint32" | "uint32x2" | "uint32x3" | "uint32x4" | "sint32" | "sint32x2" | "sint32x3" | "sint32x4" | "float64" | "float64x2" | "float64x3" | "float64x4";

interface Navigator {
  gpu?: GPU;
}

interface GPU {
  requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
}

interface Window {
  GPUBuffer: GPUBuffer;
  GPUTexture: GPUTexture;
  GPUDevice: GPUDevice;
  GPUQueue: GPUQueue;
  GPUShaderModule: GPUShaderModule;
  GPUBindGroup: GPUBindGroup;
  GPUBindGroupLayout: GPUBindGroupLayout;
  GPUPipelineLayout: GPUPipelineLayout;
  GPURenderPipeline: GPURenderPipeline;
  GPUSampler: GPUSampler;
  GPUCommandEncoder: GPUCommandEncoder;
  GPURenderPassEncoder: GPURenderPassEncoder;
  GPUCommandBuffer: GPUCommandBuffer;
}

declare var GPUBuffer: GPUBuffer;
declare var GPUTexture: GPUTexture;
declare var GPUDevice: GPUDevice;
declare var GPUQueue: GPUQueue;
declare var GPUShaderModule: GPUShaderModule;
declare var GPUBindGroup: GPUBindGroup;
declare var GPUBindGroupLayout: GPUBindGroupLayout;
declare var GPUPipelineLayout: GPUPipelineLayout;
declare var GPURenderPipeline: GPURenderPipeline;
declare var GPUSampler: GPUSampler;
declare var GPUCommandEncoder: GPUCommandEncoder;
declare var GPURenderPassEncoder: GPURenderPassEncoder;
declare var GPUCommandBuffer: GPUCommandBuffer;
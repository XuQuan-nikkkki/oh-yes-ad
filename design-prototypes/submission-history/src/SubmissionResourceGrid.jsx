import React from 'react';
import { Image } from 'antd';
import { FileOutlined, FilePdfOutlined, FilePptOutlined, LinkOutlined, PictureOutlined } from '@ant-design/icons';

const extensionOf = value => {
  const clean = String(value || '').split(/[?#]/)[0];
  return clean.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || '';
};

const nameOf = resource => {
  if (typeof resource === 'object') return resource.name || resource.url || '未命名资源';
  const clean = String(resource || '').split(/[?#]/)[0];
  try {
    return decodeURIComponent(clean.split('/').filter(Boolean).at(-1) || resource);
  } catch {
    return clean.split('/').filter(Boolean).at(-1) || resource;
  }
};

const infoOf = resource => {
  const url = typeof resource === 'object' ? resource.url : resource;
  const name = nameOf(resource);
  const extension = extensionOf(name || url);
  const image = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic'].includes(extension);
  const previewUrl = typeof resource === 'object' ? resource.thumbnailUrl : null;
  const directImageUrl = image && /^(https?:|data:image\/|blob:|\/)/i.test(String(url || '')) ? url : null;
  if (image) return { url, name, label: extension.toUpperCase(), preview: previewUrl || directImageUrl, Icon: PictureOutlined };
  if (extension === 'pdf') return { url, name, label: 'PDF', preview: previewUrl, Icon: FilePdfOutlined };
  if (['ppt', 'pptx'].includes(extension)) return { url, name, label: extension.toUpperCase(), preview: previewUrl, Icon: FilePptOutlined };
  return { url, name, label: extension ? extension.toUpperCase() : '文件', preview: previewUrl, Icon: FileOutlined };
};

export default function SubmissionResourceGrid({ resources, onOpen }) {
  return <div className="submission-resources">
    {resources.map((resource, index) => {
      const { url, name, label, preview, Icon } = infoOf(resource);
      return <div className="submission-resource" key={`${url}-${index}`}>
        <div className={`resource-thumbnail${preview ? ' has-preview' : ''}`}>
          {preview ? <Image src={preview} alt={name} preview={{ mask: '预览' }}/> : <><Icon/><small>{label}</small></>}
        </div>
        <button type="button" className="resource-caption" title={name} onClick={() => onOpen(url, name)}>
          <span>{name}</span><LinkOutlined/>
        </button>
      </div>;
    })}
  </div>;
}

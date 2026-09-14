import { useMemo } from 'react';
import type { ProjectFile } from '~/lib/types';

interface FileTreeProps {
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onDeleteFile: (fileId: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
  file?: ProjectFile;
}

function buildTree(files: ProjectFile[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isFolder: true, children: [] };

  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join('/');

      let child = current.children.find((c) => c.name === part);

      if (!child) {
        child = {
          name: part,
          path: fullPath,
          isFolder: !isLast,
          children: [],
          file: isLast ? file : undefined,
        };
        current.children.push(child);
      }

      current = child;
    }
  }

  sortTree(root);
  return root;
}

function sortTree(node: TreeNode) {
  node.children.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(sortTree);
}

function getIcon(name: string, isFolder: boolean): string {
  if (isFolder) return 'folder';
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    tsx: 'react',
    jsx: 'react',
    ts: 'ts',
    js: 'js',
    json: 'json',
    css: 'css',
    html: 'html',
    md: 'md',
  };
  return iconMap[ext] || 'file';
}

function Icon({ type }: { type: string }) {
  const icons: Record<string, React.ReactElement> = {
    folder: (
      <svg className="w-4 h-4 text-[#9E7FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
    react: (
      <svg className="w-4 h-4 text-[#61DAFB]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <circle cx="12" cy="12" r="2" />
        <ellipse cx="12" cy="12" rx="10" ry="4" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
      </svg>
    ),
    ts: (
      <svg className="w-4 h-4 text-[#3178C6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 17V9h6" /><path d="M15 17v-4" />
      </svg>
    ),
    js: (
      <svg className="w-4 h-4 text-[#F7DF1E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 17v-5M15 17v-3a2 2 0 00-2-2" />
      </svg>
    ),
    json: (
      <svg className="w-4 h-4 text-[#A3A3A3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M8 6c-2 0-3 1-3 3s1 3 3 3 3 1 3 3-1 3-3 3M16 6c2 0 3 1 3 3s-1 3-3 3-3 1-3 3 1 3 3 3" />
      </svg>
    ),
    css: (
      <svg className="w-4 h-4 text-[#1572B6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M5 4l1 16 6 2 6-2 1-16M8 8h8l-1 8-5 2-5-2" />
      </svg>
    ),
    html: (
      <svg className="w-4 h-4 text-[#E34F26]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M4 4l2 16 6 2 6-2 2-16M7 8h10l-1 10-4 2-4-2" />
      </svg>
    ),
    md: (
      <svg className="w-4 h-4 text-[#A3A3A3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M8 12h8M8 8h8M8 16h4" />
      </svg>
    ),
    file: (
      <svg className="w-4 h-4 text-[#A3A3A3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M13 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9l-6-6z" />
        <path d="M13 3v6h6" />
      </svg>
    ),
  };
  return icons[type] || icons.file;
}

function TreeItem({
  node,
  depth,
  selectedFile,
  onSelectFile,
  onDeleteFile,
}: {
  node: TreeNode;
  depth: number;
  selectedFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onDeleteFile: (fileId: string) => void;
}) {
  const paddingLeft = depth * 12 + 8;

  if (node.isFolder && node.path) {
    return (
      <div>
        <div
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#A3A3A3] cursor-default"
          style={{ paddingLeft }}
        >
          <Icon type="folder" />
          <span className="truncate">{node.name}</span>
        </div>
        {node.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth + 1}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            onDeleteFile={onDeleteFile}
          />
        ))}
      </div>
    );
  }

  if (!node.file) {
    return (
      <>
        {node.children.map((child) => (
          <TreeItem
            key={child.path}
            node={child}
            depth={depth}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
            onDeleteFile={onDeleteFile}
          />
        ))}
      </>
    );
  }

  const isSelected = selectedFile?.id === node.file.id;

  return (
    <div
      className={`group flex items-center gap-1.5 px-2 py-1 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-[#9E7FFF]/10 text-white'
          : 'text-[#A3A3A3] hover:bg-[#262626] hover:text-white'
      }`}
      style={{ paddingLeft }}
      onClick={() => onSelectFile(node.file!)}
    >
      <Icon type={getIcon(node.name, false)} />
      <span className="text-xs truncate flex-1">{node.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDeleteFile(node.file!.id);
        }}
        className="opacity-0 group-hover:opacity-100 text-[#A3A3A3] hover:text-red-400 transition-all"
        aria-label="Delete file"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

export default function FileTree({ files, selectedFile, onSelectFile, onDeleteFile }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  if (files.length === 0) {
    return (
      <div className="p-4 text-center">
        <svg className="w-10 h-10 text-[#3F3F3F] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p className="text-xs text-[#A3A3A3]">No files generated</p>
      </div>
    );
  }

  return (
    <div className="py-2 overflow-y-auto h-full">
      <TreeItem
        node={tree}
        depth={0}
        selectedFile={selectedFile}
        onSelectFile={onSelectFile}
        onDeleteFile={onDeleteFile}
      />
    </div>
  );
}

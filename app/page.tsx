'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginModal from '@/components/LoginModal';

/* ---- SVG Icons (stroke-based, consistent with Sidebar) ---- */
const svgProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

const SparklesIcon = () => (
  <svg {...svgProps}>
    <path d='M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z' />
    <path d='M6 16l.5 1.5L8 18l-1.5.5L6 20l-.5-1.5L4 18l1.5-.5L6 16z' />
  </svg>
);

const CpuIcon = () => (
  <svg {...svgProps}>
    <rect x='4' y='4' width='16' height='16' rx='2' />
    <rect x='9' y='9' width='6' height='6' />
    <line x1='9' y1='1' x2='9' y2='4' />
    <line x1='15' y1='1' x2='15' y2='4' />
    <line x1='9' y1='20' x2='9' y2='23' />
    <line x1='15' y1='20' x2='15' y2='23' />
    <line x1='20' y1='9' x2='23' y2='9' />
    <line x1='20' y1='14' x2='23' y2='14' />
    <line x1='1' y1='9' x2='4' y2='9' />
    <line x1='1' y1='14' x2='4' y2='14' />
  </svg>
);

const CloudIcon = () => (
  <svg {...svgProps}>
    <path d='M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z' />
  </svg>
);

const ZapIcon = () => (
  <svg {...svgProps}>
    <polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2' />
  </svg>
);

const PlugIcon = () => (
  <svg {...svgProps}>
    <path d='M12 22v-5' />
    <path d='M9 8V2' />
    <path d='M15 8V2' />
    <path d='M18 8v5a6 6 0 0 1-12 0V8' />
  </svg>
);

const ScaleIcon = () => (
  <svg {...svgProps}>
    <line x1='3' y1='6' x2='21' y2='6' />
    <path d='M3 12h5l2 3h4l2-3h5' />
    <line x1='3' y1='18' x2='21' y2='18' />
  </svg>
);

const KeyIcon = () => (
  <svg {...svgProps}>
    <path d='M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4' />
  </svg>
);

const ChartBarIcon = () => (
  <svg {...svgProps}>
    <line x1='18' y1='20' x2='18' y2='10' />
    <line x1='12' y1='20' x2='12' y2='4' />
    <line x1='6' y1='20' x2='6' y2='14' />
    <line x1='2' y1='20' x2='22' y2='20' />
  </svg>
);

const models = [
  {
    name: 'DeepSeek V4',
    provider: '深度求索 · 旗舰模型',
    modelId: 'deepseek-v4',
    rate: 'x1.0',
    feature: '1M tokens 上下文',
    icon: <SparklesIcon />,
    colorClass: 'model-card-accent-purple'
  },
  {
    name: '智谱 GLM-5',
    provider: '智谱 AI · 旗舰模型',
    modelId: 'glm-5',
    rate: 'x1.2',
    feature: '思维链推理',
    icon: <CpuIcon />,
    colorClass: 'model-card-accent-cyan'
  },
  {
    name: '通义千问 qwen-plus',
    provider: '阿里云 · 增强模型',
    modelId: 'qwen-plus',
    rate: 'x0.8',
    feature: '高性价比',
    icon: <CloudIcon />,
    colorClass: 'model-card-accent-amber'
  },
  {
    name: 'MiniMax M2.7',
    provider: 'MiniMax · 旗舰模型',
    modelId: 'minimax-m2.7',
    rate: 'x1.0',
    feature: '长文本生成',
    icon: <ZapIcon />,
    colorClass: 'model-card-accent-green'
  }
];

function useLoginState() {
  const [hasToken, setHasToken] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('admin_token');
    setHasToken(!!token);
  }, []);

  return { hasToken, mounted };
}

export default function LandingPage() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const router = useRouter();
  const { hasToken, mounted } = useLoginState();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAdminClick = () => {
    if (hasToken) {
      router.push('/dashboard');
    } else {
      setLoginModalOpen(true);
    }
  };

  const handleStartClick = () => {
    if (hasToken) {
      router.push('/dashboard');
    } else {
      setLoginModalOpen(true);
    }
  };

  return (
    <div className='landing'>
      <nav className='landing-nav'>
        <div className='landing-nav-brand'>
          <div className='landing-nav-logo'>R</div>
          <span className='landing-nav-name'>AI Router</span>
          <span className='landing-nav-tag'>v1.0</span>
        </div>
        <div className='landing-nav-actions'>
          <button
            className='btn btn-ghost'
            onClick={handleAdminClick}
          >
            管理后台
          </button>
          <button
            className='btn btn-primary'
            onClick={() => scrollTo('api-doc')}
          >
            API 文档
          </button>
        </div>
      </nav>

      <section className='landing-hero'>
        <h1>AI 模型智能中转站</h1>
        <p>
          兼容 OpenAI API 格式，一键接入 DeepSeek、智谱
          GLM、通义千问、MiniMax，支持多模型负载均衡与自动故障转移
        </p>
        <div className='landing-hero-actions'>
          <button
            className='btn btn-primary'
            onClick={handleStartClick}
          >
            开始使用
          </button>
          <button className='btn' onClick={() => scrollTo('models')}>
            查看模型
          </button>
        </div>
      </section>

      <section id='models' className='landing-section'>
        <h2>支持的模型</h2>
        <p className='landing-section-subtitle'>
          接入四大国产旗舰模型，覆盖不同场景需求
        </p>
        <div className='model-grid'>
          {models.map((m) => (
            <div key={m.modelId} className={`model-card ${m.colorClass}`}>
              <div className='model-card-icon'>{m.icon}</div>
              <div className='model-card-body'>
                <div className='model-card-title-row'>
                  <h3>{m.name}</h3>
                  <span className='model-id-badge'>{m.modelId}</span>
                </div>
                <p className='model-card-provider'>{m.provider}</p>
                <div className='model-card-meta-list'>
                  <div className='meta-item'>
                    <span className='meta-label'>计费倍率</span>
                    <span className='meta-value'>{m.rate}</span>
                  </div>
                  <div className='meta-item'>
                    <span className='meta-label'>特色能力</span>
                    <span className='meta-value'>{m.feature}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className='feature-section'>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 32px' }}>
          <h2>核心特性</h2>
          <p className='landing-section-subtitle'>开箱即用的企业级能力</p>
          <div className='feature-grid'>
            <div className='feature-item'>
              <div className='feature-icon'>
                <PlugIcon />
              </div>
              <h3>OpenAI 兼容</h3>
              <p>
                完全兼容 OpenAI Chat Completions API，只需修改 base_url 和
                api_key 即可接入
              </p>
            </div>
            <div className='feature-item'>
              <div className='feature-icon'>
                <ScaleIcon />
              </div>
              <h3>负载均衡</h3>
              <p>auto 模式自动选择可用渠道，请求失败自动重试到其他模型</p>
            </div>
            <div className='feature-item'>
              <div className='feature-icon'>
                <KeyIcon />
              </div>
              <h3>Key 管理</h3>
              <p>独立 API Key 体系，支持余额控制和用量统计</p>
            </div>
            <div className='feature-item'>
              <div className='feature-icon'>
                <ChartBarIcon />
              </div>
              <h3>用量监控</h3>
              <p>实时记录 Token 消耗，可视化统计图表，精确计费</p>
            </div>
          </div>
        </div>
      </section>

      <section id='api-doc' className='landing-section'>
        <h2>快速接入</h2>
        <p className='landing-section-subtitle'>
          只需修改两行代码，即可将现有 OpenAI 应用无缝切换到 AI Router
        </p>

        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div className='code-label'>
            <span className='code-label-dot'></span>Python (OpenAI SDK)
          </div>
          <pre className='code-block'>{`from openai import OpenAI

client = OpenAI(
  base_url="http://localhost:3012/v1",
  api_key="sk-router-your-key"
)

response = client.chat.completions.create(
  model="deepseek-v4",  # 或 glm-5 / qwen-plus / minimax-m1 / auto
  messages=[{"role": "user", "content": "你好"}],
  stream=True
)`}</pre>

          <div className='code-label' style={{ marginTop: 28 }}>
            <span className='code-label-dot'></span>cURL
          </div>
          <pre className='code-block'>{`curl http://localhost:3012/v1/chat/completions \\
  -H "Authorization: Bearer sk-router-your-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'`}</pre>
        </div>
      </section>

      <footer className='landing-footer'>
        AI Router &copy; 2026 &middot; 兼容 OpenAI API 的多模型智能中转站
      </footer>

      <LoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={() => router.push('/dashboard')}
      />
    </div>
  );
}

import dynamic from 'next/dynamic';

export const Home = dynamic(() => import('@/components/Home').then((mod) => mod._Home), { ssr: false });
export const Home_OLD = dynamic(() => import('@/components/Home_OLD').then((mod) => mod._Home_OLD), { ssr: false });
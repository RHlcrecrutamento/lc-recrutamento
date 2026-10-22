import { SimpleReviewDashboard } from '@/components/SimpleReviewDashboard';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<{historico?:string}>}){return <SimpleReviewDashboard section="candidatos" history={(await searchParams).historico==='1'}/>;}

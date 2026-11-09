import RoomClient from '@/components/RoomClient';

export async function generateMetadata({ params }) {
  const { code } = await params;
  return { title: `Room ${code.toUpperCase()} — Lorekeeper` };
}

export default async function RoomPage({ params }) {
  const { code } = await params;
  return <RoomClient code={code.toUpperCase()} />;
}

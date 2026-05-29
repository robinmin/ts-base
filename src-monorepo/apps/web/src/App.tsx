import type { Planet } from '@SCOPE/api';
import { useEffect, useState } from 'react';
import { orpc } from './orpc';

export function App() {
    const [planets, setPlanets] = useState<Planet[]>([]);

    useEffect(() => {
        orpc.list({}).then(setPlanets).catch(console.error);
    }, []);

    return (
        <main>
            <h1>Planets</h1>
            <ul>
                {planets.map((p) => (
                    <li key={p.id}>
                        {p.name}
                        {p.description && ` — ${p.description}`}
                    </li>
                ))}
            </ul>
        </main>
    );
}

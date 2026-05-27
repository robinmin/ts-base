import { likesLabel, samplePosts } from './posts.js';

export function App() {
    return (
        <main>
            <h1>web</h1>
            <p>{likesLabel(samplePosts)}</p>
        </main>
    );
}

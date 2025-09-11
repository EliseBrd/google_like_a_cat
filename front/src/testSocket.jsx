import React, { useState, useEffect, useRef } from "react";
import { Client } from "@stomp/stompjs";

const WebSocketSearch = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [status, setStatus] = useState("Déconnecté");
    const stompClient = useRef(null);

    useEffect(() => {
        // Création du client STOMP
        stompClient.current = new Client({
            brokerURL: "ws://localhost:8080/ws", // ton endpoint WebSocket
            reconnectDelay: 5000, // reconnexion automatique
            debug: (str) => console.log(str),
        });

        stompClient.current.onConnect = (frame) => {
            console.log("Connecté STOMP :", frame, stompClient.current);
            setStatus("Connecté");

            // S'abonner au topic pour recevoir les résultats
            stompClient.current.subscribe(`/queue/results-user123`, (message) => {
                try {
                    const body = JSON.parse(message.body);
                    if (body.status === "COMPLETED") {
                        setStatus("Recherche terminée");
                    } else if (body.status === "ERROR") {
                        setStatus("Erreur : " + body.message);
                    } else {
                        setResults((prev) => [...prev, body]);
                    }
                } catch (e) {
                    console.log("Message reçu :", message.body);
                    console.error(e);

                }
            });
        };

        stompClient.current.activate();

        return () => {
            if (stompClient.current) {
                //stompClient.current.deactivate();
            }
        };
    }, []);

    const startSearch = () => {
        setResults([]);
        setStatus("Recherche en cours...");
        // Envoyer la requête au serveur via /app/startSearch
        stompClient.current.publish({
            destination: "/app/startSearch",
            body: JSON.stringify({ "query": query, "sessionId": "user123" }),
        });
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>Recherche WebSocket STOMP</h2>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tape ta requête"
            />
            <button onClick={startSearch} style={{ marginLeft: "10px" }}>
                Rechercher
            </button>
            <p>Status : {status}</p>
            <ul>
                {results.map((r, index) => (
                    <li key={index}>
                        {r.filename} - page {r.page} - paragraphe {r.paragraph} - ligne{" "}
                        {r.line}: {r.content}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default WebSocketSearch;

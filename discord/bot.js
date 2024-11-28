const fs = require('fs');
const path = require('path');

// Ścieżka do pliku server.json
const serverFilePath = path.join(__dirname, 'server.json');

module.exports = {
    // Funkcja do zapisywania danych o serwerach
    saveServerData: function(serverId, serverName) {
        let serverData = { id: serverId, name: serverName };

        // Odczytujemy istniejące dane z pliku server.json
        fs.readFile(serverFilePath, (err, data) => {
            if (err) {
                console.error('Błąd odczytu pliku:', err);
                return;
            }

            let servers = JSON.parse(data);

            // Dodajemy nowe dane o serwerze
            servers.servers.push(serverData);

            // Zapisujemy zaktualizowane dane do pliku
            fs.writeFile(serverFilePath, JSON.stringify(servers, null, 2), (err) => {
                if (err) {
                    console.error('Błąd zapisu do pliku:', err);
                } else {
                    console.log(`Zapisano dane serwera ${serverName} (${serverId})`);
                }
            });
        });
    },

    // Funkcja do sprawdzania, czy bot jest na danym serwerze
    isBotOnServer: function(client, serverId) {
        return client.guilds.cache.has(serverId);  // Sprawdzenie, czy bot jest na serwerze
    },

    // Funkcja do ustawienia statusu bota
    setBotStatus: function(client) {
        const status = 'Dostępny';  // Status bota, np. 'Dostępny'
        client.user.setPresence({
            activities: [{ name: status }],
            status: 'online'
        });
    }
};

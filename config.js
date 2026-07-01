    <script>
        function buscarCEP() {
            const cep = document.getElementById('cep').value;
            fetch(`https://viacep.com.br/ws/${cep}/json`)

                .then(response => response.json())
                .then(dados => {
                    if (dados.erro && dados.erro === "true") {
                        document.getElementById('Resultado').innerHTML = "digite um cep valido"
                        return
                    }
                    let logradouro = dados.logradouro
                    let bairro = dados.bairro

                    document.getElementById('Resultado').innerHTML = `
            CEP: ${dados.cep} <br>
            Logradouro: ${dados.logradouro} <br>
            Bairro: ${dados.bairro} <br>
            Cidade: ${dados.uf} <br>
            Estado: ${dados.estado} <br>

            `
                })
                .catch(erro => {
                    document.getElementById('Resultado').innerHTML = "CEP não encontrado, desculpe"
                })
        }
    </script>
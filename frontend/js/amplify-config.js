// Configuração do AWS Amplify para CloudOps
// Importa as configurações geradas automaticamente pelo Amplify Gen 2
import outputs from '../../amplify_outputs.json';
import { Amplify } from 'aws-amplify';

// Configura o Amplify com as outputs geradas
Amplify.configure(outputs);

// Exportar a configuração para uso em outros módulos
export default outputs;

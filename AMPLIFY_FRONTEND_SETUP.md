# Connecting Amplify Data Backend to Frontend

## Files Created

1. **`frontend/js/amplify-config.js`** - Amplify configuration (updated)
2. **`frontend/js/data-client.js`** - Data operations wrapper
3. **`frontend/test-amplify.html`** - Test page to verify connection

## Setup Steps

### 1. Deploy Your Amplify Backend

First, deploy your backend to generate `amplify_outputs.json`:

```bash
# From project root
npx ampx sandbox
```

This will:
- Deploy your Lambda function
- Create the GraphQL API
- Generate `amplify_outputs.json` with all connection details

### 2. Install Frontend Dependencies

Your `aws-amplify` package is already installed in root `package.json`.

### 3. Use in Your Existing Pages

Update your existing HTML files to use the data client:

```html
<!-- In cadastro-perfil.html or any other page -->
<script type="module">
    import { createUser } from './js/data-client.js';
    
    // Example: Create user on form submit
    async function handleSubmit(event) {
        event.preventDefault();
        
        try {
            const userData = {
                nome: document.getElementById('nome').value,
                email: document.getElementById('email').value,
                password_hash: await hashPassword(document.getElementById('password').value),
                tipo_usuario: document.getElementById('tipo_usuario').value,
                cidade: document.getElementById('cidade').value,
                estado: document.getElementById('estado').value,
                escolaridade: document.getElementById('escolaridade').value,
                curso: document.getElementById('curso').value,
                instituicao: document.getElementById('instituicao').value
            };
            
            const user = await createUser(userData);
            console.log('User created:', user);
            alert('Perfil criado com sucesso!');
            
        } catch (error) {
            console.error('Error:', error);
            alert('Erro ao criar perfil: ' + error.message);
        }
    }
</script>
```

### 4. Test the Connection

Open `frontend/test-amplify.html` in a browser (needs to be served, not file://):

```bash
# Option 1: Use Python
python -m http.server 8000

# Option 2: Use Node.js http-server
npx http-server frontend -p 8000

# Then open: http://localhost:8000/test-amplify.html
```

### 5. Update Your Existing JavaScript Files

#### Example: Update `frontend/js/cadastro-perfil.js`

```javascript
import { createUser } from './data-client.js';

async function cadastrarPerfil(formData) {
    try {
        const user = await createUser({
            nome: formData.nome,
            email: formData.email,
            password_hash: formData.passwordHash,
            tipo_usuario: formData.tipoUsuario,
            cidade: formData.cidade,
            estado: formData.estado,
            escolaridade: formData.escolaridade,
            curso: formData.curso,
            instituicao: formData.instituicao
        });
        
        return user;
    } catch (error) {
        throw error;
    }
}
```

#### Example: List Projects

```javascript
import { listProjects } from './data-client.js';

async function loadProjects() {
    try {
        const projects = await listProjects({ status: 'OPEN' });
        displayProjects(projects);
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}
```

## Available Functions

### Users
- `getUser(userId)` - Get single user
- `listUsers({ tipo_usuario, cidade, escolaridade })` - List users with filters
- `createUser(userData)` - Create new user

### Projects
- `listProjects({ status, id_proprietario })` - List projects with filters
- `createProject(projectData)` - Create new project

### Skills
- `getUserSkills(userId)` - Get user's skills
- `getProjectSkills(projectId)` - Get project's required skills

## Important Notes

1. **Module Type**: All imports use ES6 modules (`type="module"`)
2. **CORS**: Make sure your Lambda has proper CORS headers
3. **Authentication**: Currently set to `allow.guest()` - update for production
4. **Error Handling**: All functions include try/catch blocks

## Next Steps

1. Run `npx ampx sandbox` to deploy backend
2. Test with `frontend/test-amplify.html`
3. Update your existing pages to use `data-client.js`
4. Add proper authentication (replace `allow.guest()`)

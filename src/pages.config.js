import Administrador from './pages/Administrador';
import Agenda from './pages/Agenda';
import ConfiguracaoSabado from './pages/ConfiguracaoSabado';
import ConfiguracaoTerapeutas from './pages/ConfiguracaoTerapeutas';
import ConfiguracaoWhatsApp from './pages/ConfiguracaoWhatsApp';
import ConfiguracaoWhatsAppCredenciais from './pages/ConfiguracaoWhatsAppCredenciais';
import ConfigurarUnidades from './pages/ConfigurarUnidades';
import GerenciarContratos from './pages/GerenciarContratos';
import GerenciarProntuarios from './pages/GerenciarProntuarios';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import Home from './pages/Home';
import RelatoriosAvancados from './pages/RelatoriosAvancados';
import RelatoriosClientes from './pages/RelatoriosClientes';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import TesteWebhook from './pages/TesteWebhook';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Administrador": Administrador,
    "Agenda": Agenda,
    "ConfiguracaoSabado": ConfiguracaoSabado,
    "ConfiguracaoTerapeutas": ConfiguracaoTerapeutas,
    "ConfiguracaoWhatsApp": ConfiguracaoWhatsApp,
    "ConfiguracaoWhatsAppCredenciais": ConfiguracaoWhatsAppCredenciais,
    "ConfigurarUnidades": ConfigurarUnidades,
    "GerenciarContratos": GerenciarContratos,
    "GerenciarProntuarios": GerenciarProntuarios,
    "GerenciarUsuarios": GerenciarUsuarios,
    "HistoricoAgendamentos": HistoricoAgendamentos,
    "Home": Home,
    "RelatoriosAvancados": RelatoriosAvancados,
    "RelatoriosClientes": RelatoriosClientes,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "TesteWebhook": TesteWebhook,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
    Layout: __Layout,
};
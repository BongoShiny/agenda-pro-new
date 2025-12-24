import Administrador from './pages/Administrador';
import Agenda from './pages/Agenda';
import ConfiguracaoTerapeutas from './pages/ConfiguracaoTerapeutas';
import ConfiguracaoWhatsApp from './pages/ConfiguracaoWhatsApp';
import ConfigurarUnidades from './pages/ConfigurarUnidades';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import Home from './pages/Home';
import RelatoriosClientes from './pages/RelatoriosClientes';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import GerenciarProntuarios from './pages/GerenciarProntuarios';


export const PAGES = {
    "Administrador": Administrador,
    "Agenda": Agenda,
    "ConfiguracaoTerapeutas": ConfiguracaoTerapeutas,
    "ConfiguracaoWhatsApp": ConfiguracaoWhatsApp,
    "ConfigurarUnidades": ConfigurarUnidades,
    "GerenciarUsuarios": GerenciarUsuarios,
    "HistoricoAgendamentos": HistoricoAgendamentos,
    "Home": Home,
    "RelatoriosClientes": RelatoriosClientes,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "GerenciarProntuarios": GerenciarProntuarios,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
};
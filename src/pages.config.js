import Agenda from './pages/Agenda';
import ConfiguracaoTerapeutas from './pages/ConfiguracaoTerapeutas';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import ConfigurarUnidades from './pages/ConfigurarUnidades';
import Administrador from './pages/Administrador';
import RelatoriosClientes from './pages/RelatoriosClientes';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import Home from './pages/Home';
import ConfiguracaoWhatsApp from './pages/ConfiguracaoWhatsApp';


export const PAGES = {
    "Agenda": Agenda,
    "ConfiguracaoTerapeutas": ConfiguracaoTerapeutas,
    "GerenciarUsuarios": GerenciarUsuarios,
    "HistoricoAgendamentos": HistoricoAgendamentos,
    "ConfigurarUnidades": ConfigurarUnidades,
    "Administrador": Administrador,
    "RelatoriosClientes": RelatoriosClientes,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "Home": Home,
    "ConfiguracaoWhatsApp": ConfiguracaoWhatsApp,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
};
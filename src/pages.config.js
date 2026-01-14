import GerenciarProntuarios from './pages/GerenciarProntuarios';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import RelatoriosAvancados from './pages/RelatoriosAvancados';
import ConfiguracaoTerapeutas from './pages/ConfiguracaoTerapeutas';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import ConfiguracaoWhatsApp from './pages/ConfiguracaoWhatsApp';
import ConfigurarUnidades from './pages/ConfigurarUnidades';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import Administrador from './pages/Administrador';
import RelatoriosClientes from './pages/RelatoriosClientes';
import Home from './pages/Home';
import Agenda from './pages/Agenda';
import GerenciarContratos from './pages/GerenciarContratos';


export const PAGES = {
    "GerenciarProntuarios": GerenciarProntuarios,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "RelatoriosAvancados": RelatoriosAvancados,
    "ConfiguracaoTerapeutas": ConfiguracaoTerapeutas,
    "HistoricoAgendamentos": HistoricoAgendamentos,
    "ConfiguracaoWhatsApp": ConfiguracaoWhatsApp,
    "ConfigurarUnidades": ConfigurarUnidades,
    "GerenciarUsuarios": GerenciarUsuarios,
    "Administrador": Administrador,
    "RelatoriosClientes": RelatoriosClientes,
    "Home": Home,
    "Agenda": Agenda,
    "GerenciarContratos": GerenciarContratos,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
};
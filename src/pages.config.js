import Administrador from './pages/Administrador';
import Agenda from './pages/Agenda';
import ConfiguracaoTerapeutas from './pages/ConfiguracaoTerapeutas';
import ConfiguracaoWhatsApp from './pages/ConfiguracaoWhatsApp';
import ConfigurarUnidades from './pages/ConfigurarUnidades';
import GerenciarContratos from './pages/GerenciarContratos';
import GerenciarProntuarios from './pages/GerenciarProntuarios';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import HistoricoAgendamentos from './pages/HistoricoAgendamentos';
import Home from './pages/Home';
import RelatoriosAvancados from './pages/RelatoriosAvancados';
import RelatoriosClientes from './pages/RelatoriosClientes';
import RelatoriosFinanceiros from './pages/RelatoriosFinanceiros';
import ConfiguracaoSabado from './pages/ConfiguracaoSabado';


export const PAGES = {
    "Administrador": Administrador,
    "Agenda": Agenda,
    "ConfiguracaoTerapeutas": ConfiguracaoTerapeutas,
    "ConfiguracaoWhatsApp": ConfiguracaoWhatsApp,
    "ConfigurarUnidades": ConfigurarUnidades,
    "GerenciarContratos": GerenciarContratos,
    "GerenciarProntuarios": GerenciarProntuarios,
    "GerenciarUsuarios": GerenciarUsuarios,
    "HistoricoAgendamentos": HistoricoAgendamentos,
    "Home": Home,
    "RelatoriosAvancados": RelatoriosAvancados,
    "RelatoriosClientes": RelatoriosClientes,
    "RelatoriosFinanceiros": RelatoriosFinanceiros,
    "ConfiguracaoSabado": ConfiguracaoSabado,
}

export const pagesConfig = {
    mainPage: "Agenda",
    Pages: PAGES,
};
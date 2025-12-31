import type { LiquidTheme } from "../../types/theme";
import { buildDefaultManifest } from "../../manifest/builder";

// Import all components (77 total)
import { Accordion } from "../../renderer/components/accordion";
import { Alert } from "../../renderer/components/alert";
import { AlertDialog } from "../../renderer/components/alertdialog";
import { AreaChart } from "../../renderer/components/area-chart";
import { Audio } from "../../renderer/components/audio";
import { Avatar } from "../../renderer/components/avatar";
import { Badge } from "../../renderer/components/badge";
import { BarChart } from "../../renderer/components/bar-chart";
import { Breadcrumb } from "../../renderer/components/breadcrumb";
import { Button } from "../../renderer/components/button";
import { Calendar } from "../../renderer/components/calendar";
import { Card } from "../../renderer/components/card";
import { Carousel } from "../../renderer/components/carousel";
import { Checkbox } from "../../renderer/components/checkbox";
import { Collapsible } from "../../renderer/components/collapsible";
import { Color } from "../../renderer/components/color";
import { Command } from "../../renderer/components/command";
import { Container } from "../../renderer/components/container";
import { ContextMenu } from "../../renderer/components/contextmenu";
import { DataTable } from "../../renderer/components/data-table";
import { DatePicker } from "../../renderer/components/date";
import { DateRange } from "../../renderer/components/daterange";
import { Drawer } from "../../renderer/components/drawer";
import { Dropdown } from "../../renderer/components/dropdown";
import { Empty } from "../../renderer/components/empty";
import { Flow } from "../../renderer/components/flow";
import { Form } from "../../renderer/components/form";
import { Gauge } from "../../renderer/components/gauge";
import { Grid } from "../../renderer/components/grid";
import { Header } from "../../renderer/components/header";
import { Heading } from "../../renderer/components/heading";
import { Heatmap } from "../../renderer/components/heatmap";
import { HoverCard } from "../../renderer/components/hovercard";
import { Icon } from "../../renderer/components/icon";
import { Image } from "../../renderer/components/image";
import { Input } from "../../renderer/components/input";
import { Kanban } from "../../renderer/components/kanban";
import { KPICard } from "../../renderer/components/kpi-card";
import { Lightbox } from "../../renderer/components/lightbox";
import { LineChart } from "../../renderer/components/line-chart";
import { List } from "../../renderer/components/list";
import { Map as MapComponent } from "../../renderer/components/map";
import { Modal } from "../../renderer/components/modal";
import { Nav } from "../../renderer/components/nav";
import { Org } from "../../renderer/components/org";
import { OTP } from "../../renderer/components/otp";
import { Pagination } from "../../renderer/components/pagination";
import { PieChart } from "../../renderer/components/pie-chart";
import { Popover } from "../../renderer/components/popover";
import { Progress } from "../../renderer/components/progress";
import { Radio } from "../../renderer/components/radio";
import { Range } from "../../renderer/components/range";
import { Rating } from "../../renderer/components/rating";
import { Sankey } from "../../renderer/components/sankey";
import { Scatter } from "../../renderer/components/scatter";
import { Select } from "../../renderer/components/select";
import { Separator } from "../../renderer/components/separator";
import { Sheet } from "../../renderer/components/sheet";
import { Sidebar } from "../../renderer/components/sidebar";
import { Skeleton } from "../../renderer/components/skeleton";
import { Sparkline } from "../../renderer/components/sparkline";
import { Spinner } from "../../renderer/components/spinner";
import { Split } from "../../renderer/components/split";
import { Stack } from "../../renderer/components/stack";
import { Stepper } from "../../renderer/components/stepper";
import { Switch } from "../../renderer/components/switch";
import { Tabs } from "../../renderer/components/tabs";
import { Tag } from "../../renderer/components/tag";
import { Text } from "../../renderer/components/text";
import { Textarea } from "../../renderer/components/textarea";
import { Timeline } from "../../renderer/components/timeline";
import { Time } from "../../renderer/components/time";
import { Toast } from "../../renderer/components/toast";
import { Tooltip } from "../../renderer/components/tooltip";
import { Tree } from "../../renderer/components/tree";
import { Upload } from "../../renderer/components/upload";
import { Video } from "../../renderer/components/video";

// Fallback for unknown types
import { UnknownComponent } from "../../renderer/components/unknown";

export const defaultTheme: LiquidTheme = {
  name: "default",
  version: "1.0.0",
  components: {
    // Layout
    container: Container,
    grid: Grid,
    stack: Stack,
    split: Split,
    sidebar: Sidebar,

    // Typography
    heading: Heading,
    text: Text,

    // Navigation
    nav: Nav,
    breadcrumb: Breadcrumb,
    tabs: Tabs,
    stepper: Stepper,
    pagination: Pagination,

    // Data Display
    card: Card,
    "kpi-card": KPICard,
    badge: Badge,
    tag: Tag,
    avatar: Avatar,
    icon: Icon,
    image: Image,
    list: List,
    tree: Tree,
    "data-table": DataTable,
    timeline: Timeline,
    kanban: Kanban,
    calendar: Calendar,
    empty: Empty,
    skeleton: Skeleton,

    // Charts
    "line-chart": LineChart,
    "bar-chart": BarChart,
    "area-chart": AreaChart,
    "pie-chart": PieChart,
    scatter: Scatter,
    heatmap: Heatmap,
    gauge: Gauge,
    sparkline: Sparkline,
    sankey: Sankey,

    // Diagrams
    flow: Flow,
    org: Org,
    map: MapComponent,

    // Forms
    form: Form,
    input: Input,
    textarea: Textarea,
    select: Select,
    checkbox: Checkbox,
    radio: Radio,
    switch: Switch,
    range: Range,
    rating: Rating,
    date: DatePicker,
    daterange: DateRange,
    time: Time,
    color: Color,
    otp: OTP,
    upload: Upload,

    // Actions
    button: Button,

    // Feedback
    alert: Alert,
    "alert-dialog": AlertDialog,
    progress: Progress,
    spinner: Spinner,
    toast: Toast,

    // Overlays
    modal: Modal,
    drawer: Drawer,
    sheet: Sheet,
    popover: Popover,
    tooltip: Tooltip,
    dropdown: Dropdown,
    "context-menu": ContextMenu,
    "hover-card": HoverCard,
    command: Command,

    // Disclosure
    accordion: Accordion,
    collapsible: Collapsible,

    // Media
    video: Video,
    audio: Audio,
    carousel: Carousel,
    lightbox: Lightbox,

    // Misc
    header: Header,
    separator: Separator,
  },
  fallback: UnknownComponent,
  manifest: buildDefaultManifest(),
};

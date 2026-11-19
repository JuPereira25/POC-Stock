import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import totalIcon from '@/assets/Total.png';
import passIcon from '@/assets/Pass.png';
import failIcon from '@/assets/Fail.png';
import usersIcon from '@/assets/Users.png';
import styles from './Cards.module.css';

const cards = [
  {
    id: 1,
    title: 'TOTAL KITS',
    description: '12',
    icon: totalIcon,
  },
  {
    id: 2,
    title: 'KITS APROVADOS',
    description: '300',
    icon: passIcon,
  },
  {
    id: 3,
    title: 'KITS REPROVADOS',
    description: '80',
    icon: failIcon,
  },
  {
    id: 4,
    title: 'USERS',
    description: '3',
    icon: usersIcon,
  }
];

function SelectActionCard() {
  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(4, minmax(0, 1fr))',
        },
        gap: 2,
      }}
    >
      {cards.map((card) => (
        <Card key={card.id} sx={{ width: '100%' }}>
          <CardContent className={styles.content}>
            <img
              src={card.icon}
              alt=""
              className={styles.icon}
              aria-hidden="true"
            />
            <div className={styles.text}>
              <Typography variant="h5" component="div" sx={{ fontSize: '1rem'}}>
                {card.title}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '1.5rem' }}>
                {card.description}
              </Typography>
            </div>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export default SelectActionCard;
